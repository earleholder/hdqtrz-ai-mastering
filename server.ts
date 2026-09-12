import 'dotenv/config';
import crypto from 'node:crypto';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const PORT = Number(process.env.PORT || 3000);
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'hdqtrz-ai-mastering';
const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS || 'earle.holder@gmail.com')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);
const PAYMENT_LINK = 'https://buy.stripe.com/6oUaEY4Pm2bY1QlgjW77O02';
const PRICE_CENTS = 999;
const CURRENCY = 'usd';
const SIGNATURE_TOLERANCE_SECONDS = 300;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

if (!getApps().length) {
  initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
}

const db = getFirestore();
const app = express();

type AuthenticatedRequest = Request & {
  verifiedUser?: { uid: string; email: string };
};

type StripeCheckoutEvent = {
  id?: unknown;
  type?: unknown;
  data?: {
    object?: {
      client_reference_id?: unknown;
      payment_status?: unknown;
      amount_total?: unknown;
      currency?: unknown;
      mode?: unknown;
    };
  };
};

export function parseStripeSignature(header: string): { timestamp: number; signatures: string[] } | null {
  const values = header.split(',').map((part) => part.trim());
  const timestampText = values.find((part) => part.startsWith('t='))?.slice(2);
  const signatures = values
    .filter((part) => part.startsWith('v1='))
    .map((part) => part.slice(3))
    .filter((value) => /^[0-9a-f]{64}$/i.test(value));
  if (!timestampText || !/^\d+$/.test(timestampText) || signatures.length === 0) return null;
  const timestamp = Number(timestampText);
  return Number.isSafeInteger(timestamp) ? { timestamp, signatures } : null;
}

export function verifyStripeSignature(
  rawBody: Buffer,
  header: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  const parsed = parseStripeSignature(header);
  if (!parsed || !secret || Math.abs(nowSeconds - parsed.timestamp) > SIGNATURE_TOLERANCE_SECONDS) return false;
  const expected = crypto.createHmac('sha256', secret).update(String(parsed.timestamp)).update('.').update(rawBody).digest();
  return parsed.signatures.some((signature) => {
    const provided = Buffer.from(signature, 'hex');
    return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
  });
}

export function validatePaidSingleMaster(event: StripeCheckoutEvent): { eventId: string; orderId: string } | null {
  const session = event.data?.object;
  if (
    event.type !== 'checkout.session.completed' ||
    typeof event.id !== 'string' ||
    !event.id.startsWith('evt_') ||
    session?.payment_status !== 'paid' ||
    session?.amount_total !== PRICE_CENTS ||
    session?.currency !== CURRENCY ||
    session?.mode !== 'payment' ||
    typeof session?.client_reference_id !== 'string' ||
    !UUID_RE.test(session.client_reference_id)
  ) {
    return null;
  }
  return { eventId: event.id, orderId: session.client_reference_id };
}

async function requireFirebaseUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authorization = req.header('authorization') || '';
  if (!authorization.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  try {
    const token = await getAuth().verifyIdToken(authorization.slice(7), true);
    if (!token.uid || typeof token.email !== 'string' || token.email_verified !== true) {
      res.status(403).json({ error: 'A verified Google account is required.' });
      return;
    }
    req.verifiedUser = { uid: token.uid, email: token.email.toLowerCase() };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired authentication.' });
  }
}

app.disable('x-powered-by');

app.post('/api/stripe/webhook', express.raw({ type: 'application/json', limit: '256kb' }), async (req, res) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.header('stripe-signature');
  if (!secret || !signature || !Buffer.isBuffer(req.body) || !verifyStripeSignature(req.body, signature, secret)) {
    res.status(400).json({ error: 'Invalid webhook signature.' });
    return;
  }

  let event: StripeCheckoutEvent;
  try {
    event = JSON.parse(req.body.toString('utf8')) as StripeCheckoutEvent;
  } catch {
    res.status(400).json({ error: 'Invalid webhook payload.' });
    return;
  }

  if (event.type !== 'checkout.session.completed') {
    res.status(200).json({ received: true, ignored: true });
    return;
  }

  const payment = validatePaidSingleMaster(event);
  if (!payment) {
    res.status(400).json({ error: 'Payment details do not match the Single Master product.' });
    return;
  }

  try {
    const outcome = await db.runTransaction(async (transaction) => {
      const eventRef = db.collection('stripeEvents').doc(payment.eventId);
      const orderRef = db.collection('orders').doc(payment.orderId);
      const [eventSnapshot, orderSnapshot] = await Promise.all([
        transaction.get(eventRef),
        transaction.get(orderRef),
      ]);

      if (eventSnapshot.exists) return 'duplicate';
      if (!orderSnapshot.exists) throw new Error('ORDER_NOT_FOUND');

      const order = orderSnapshot.data();
      if (
        order?.status !== 'pending' ||
        order?.amount !== PRICE_CENTS ||
        order?.currency !== CURRENCY ||
        typeof order?.uid !== 'string' ||
        typeof order?.trackId !== 'string'
      ) {
        throw new Error('ORDER_MISMATCH');
      }

      transaction.create(eventRef, {
        orderId: payment.orderId,
        type: 'checkout.session.completed',
        processedAt: FieldValue.serverTimestamp(),
      });
      transaction.update(orderRef, {
        status: 'paid',
        stripeEventId: payment.eventId,
        paidAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return 'paid';
    });

    res.status(200).json({ received: true, duplicate: outcome === 'duplicate' });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'PAYMENT_PROCESSING_FAILED';
    res.status(code === 'ORDER_NOT_FOUND' ? 404 : 409).json({ error: 'Payment could not be matched to a pending order.' });
  }
});

app.use(express.json({ limit: '32kb' }));

app.post('/api/admin/session', requireFirebaseUser, (req: AuthenticatedRequest, res) => {
  const user = req.verifiedUser!;
  if (!ADMIN_EMAILS.has(user.email)) {
    res.status(403).json({ error: 'This account is not authorized for studio administration.' });
    return;
  }
  res.setHeader('Cache-Control', 'no-store');
  res.json({ authorized: true, uid: user.uid, email: user.email });
});

app.post('/api/orders', requireFirebaseUser, async (req: AuthenticatedRequest, res) => {
  const trackId = req.body?.trackId;
  const user = req.verifiedUser!;
  if (typeof trackId !== 'string' || !UUID_RE.test(trackId)) {
    res.status(400).json({ error: 'A valid track ID is required.' });
    return;
  }

  const orderId = crypto.randomUUID();
  await db.collection('orders').doc(orderId).create({
    uid: user.uid,
    email: user.email,
    trackId,
    amount: PRICE_CENTS,
    currency: CURRENCY,
    status: 'pending',
    consumed: false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const checkout = new URL(PAYMENT_LINK);
  checkout.searchParams.set('client_reference_id', orderId);
  checkout.searchParams.set('prefilled_email', user.email);
  res.setHeader('Cache-Control', 'no-store');
  res.status(201).json({ orderId, checkoutUrl: checkout.toString() });
});

app.get('/api/orders/:orderId/status', requireFirebaseUser, async (req: AuthenticatedRequest, res) => {
  if (!UUID_RE.test(req.params.orderId)) {
    res.status(400).json({ error: 'Invalid order ID.' });
    return;
  }
  const snapshot = await db.collection('orders').doc(req.params.orderId).get();
  const order = snapshot.data();
  if (!snapshot.exists || order?.uid !== req.verifiedUser!.uid) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }
  res.setHeader('Cache-Control', 'no-store');
  res.json({ orderId: snapshot.id, status: order.status, trackId: order.trackId });
});

app.post('/api/orders/:orderId/consume', requireFirebaseUser, async (req: AuthenticatedRequest, res) => {
  const trackId = req.body?.trackId;
  const orderId = req.params.orderId;
  if (!UUID_RE.test(orderId) || typeof trackId !== 'string' || !UUID_RE.test(trackId)) {
    res.status(400).json({ error: 'Valid order and track IDs are required.' });
    return;
  }

  try {
    const result = await db.runTransaction(async (transaction) => {
      const orderRef = db.collection('orders').doc(orderId);
      const snapshot = await transaction.get(orderRef);
      const order = snapshot.data();
      if (!snapshot.exists || order?.uid !== req.verifiedUser!.uid || order?.trackId !== trackId) {
        throw new Error('ORDER_NOT_FOUND');
      }
      if (order.status === 'consumed' && order.consumed === true && order.consumedTrackId === trackId) {
        return { alreadyConsumed: true };
      }
      if (order.status !== 'paid' || order.consumed === true) throw new Error('ORDER_NOT_PAID');

      transaction.update(orderRef, {
        status: 'consumed',
        consumed: true,
        consumedTrackId: trackId,
        consumedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { alreadyConsumed: false };
    });
    res.json({ unlocked: true, ...result, trackId });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'ORDER_CONSUME_FAILED';
    res.status(code === 'ORDER_NOT_PAID' ? 409 : 404).json({
      error: code === 'ORDER_NOT_PAID' ? 'Payment is not ready to use.' : 'Order not found.',
    });
  }
});

async function start() {
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { index: false }));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  } else {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HDQTRZ server listening on port ${PORT}`);
  });
}

void start();
