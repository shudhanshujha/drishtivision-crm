import { Router } from 'express';
import { getPrisma } from '../prismaClient.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Apply auth middleware
router.use(authMiddleware);

// Helper to get org_id
const getOrgId = async (req: any) => {
  if (req.user.id === 'bypass-admin') return 'bypass-org';
  const profile = await getPrisma().profile.findUnique({
    where: { id: req.user.id }
  });
  return profile?.orgId;
};

// --- Client Payments (Collections) ---
router.get('/clients', async (req: any, res) => {
  try {
    const orgId = await getOrgId(req);
    if (!orgId) return res.status(403).json({ error: 'No organization linked' });

    const payments = await getPrisma().payment.findMany({
      where: { orgId },
      include: { client: true, invoice: true },
      orderBy: { paymentDate: 'desc' }
    });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch client payments' });
  }
});

router.post('/clients', async (req: any, res) => {
  try {
    const orgId = await getOrgId(req);
    if (!orgId) return res.status(403).json({ error: 'No organization linked' });

    const { invoiceId, clientId, amount, paymentDate, paymentMode, referenceNumber, notes } = req.body;
    let internalInvoiceId = null;
    
    // Look up invoice by number or ID
    if (invoiceId) {
      const invoice = await getPrisma().invoice.findFirst({
        where: { 
          orgId,
          OR: [
            { id: invoiceId },
            { invoiceNumber: invoiceId }
          ]
        }
      });
      if (invoice) {
        internalInvoiceId = invoice.id;
      } else {
        return res.status(400).json({ error: 'Invoice reference not found.' });
      }
    } else {
        return res.status(400).json({ error: 'Invoice reference is required.' });
    }

    const payment = await getPrisma().payment.create({
      data: {
        orgId,
        invoiceId: internalInvoiceId,
        clientId,
        amount: parseFloat(amount),
        paymentDate: new Date(paymentDate),
        paymentMode,
        referenceNumber,
        notes
      }
    });
    
    // Auto-update invoice status to PAID
    await getPrisma().invoice.update({
      where: { id: internalInvoiceId },
      data: { status: 'PAID' }
    });

    res.status(201).json(payment);
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: 'Failed to record collection' });
  }
});

// --- Vendor Payments (Payouts) ---
router.get('/vendors', async (req: any, res) => {
  try {
    const orgId = await getOrgId(req);
    if (!orgId) return res.status(403).json({ error: 'No organization linked' });

    const payments = await getPrisma().vendorPayment.findMany({
      where: { orgId },
      include: { vendor: true },
      orderBy: { paymentDate: 'desc' }
    });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vendor payments' });
  }
});

router.post('/vendors', async (req: any, res) => {
  try {
    const orgId = await getOrgId(req);
    if (!orgId) return res.status(403).json({ error: 'No organization linked' });

    const { vendorId, amount, paymentDate, paymentMode, referenceNumber, purpose, notes, month, year } = req.body;

    const payment = await getPrisma().vendorPayment.create({
      data: {
        orgId,
        vendorId,
        amount: parseFloat(amount),
        paymentDate: new Date(paymentDate),
        paymentMode,
        referenceNumber,
        purpose,
        notes,
        month: month ? parseInt(month) : new Date(paymentDate).getMonth() + 1,
        year: year ? parseInt(year) : new Date(paymentDate).getFullYear()
      }
    });

    // Log in general Expenses for P&L
    await getPrisma().expense.create({
      data: {
        orgId,
        date: new Date(paymentDate),
        category: 'VENDOR_PAYOUT',
        amount: parseFloat(amount),
        description: `Vendor Payout: ${purpose || 'Inventory Settlement'}`,
        paymentMode,
        referenceNumber
      }
    });

    res.status(201).json(payment);
  } catch (error) {
    console.error('Create vendor payment error:', error);
    res.status(500).json({ error: 'Failed to record payout' });
  }
});

// Delete a client payment (collection)
router.delete('/clients/:id', async (req: any, res) => {
  try {
    const { id } = req.params;
    const orgId = await getOrgId(req);
    if (!orgId) return res.status(403).json({ error: 'No organization linked' });

    const existing = await getPrisma().payment.findFirst({ where: { id, orgId } });
    if (!existing) return res.status(404).json({ error: 'Payment not found' });

    await getPrisma().payment.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error(`[API ERROR] Failed to delete collection ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete collection' });
  }
});

// Delete a vendor payment (payout)
router.delete('/vendors/:id', async (req: any, res) => {
  try {
    const { id } = req.params;
    const orgId = await getOrgId(req);
    if (!orgId) return res.status(403).json({ error: 'No organization linked' });

    const existing = await getPrisma().vendorPayment.findFirst({ where: { id, orgId } });
    if (!existing) return res.status(404).json({ error: 'Payout not found' });

    await getPrisma().vendorPayment.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error(`[API ERROR] Failed to delete payout ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete payout' });
  }
});

export default router;

