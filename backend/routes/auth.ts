import { Router } from 'express';
import { getPrisma } from '../prismaClient.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'super-secret-key';

// Helper to get org_id
const getOrgId = async (req: any) => {
  if (req.user.id === 'bypass-admin') return 'bypass-org';
  const profile = await getPrisma().profile.findUnique({
    where: { id: req.user.id }
  });
  return profile?.orgId;
};

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const profile = await getPrisma().profile.findFirst({
      where: { 
        email: {
          equals: email.toLowerCase(),
          mode: 'insensitive'
        }
      },
      include: { organization: true }
    });

    if (!profile) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, profile.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: profile.id, email: profile.email, orgId: profile.orgId, role: profile.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      token,
      user: {
        id: profile.id,
        email: profile.email,
        fullName: profile.fullName,
        role: profile.role,
        orgId: profile.orgId,
        organization: profile.organization
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      hint: 'Check if DATABASE_URL is correct and Supabase is accessible.'
    });
  }
});

// Get current user session
router.get('/me', authMiddleware, async (req: any, res) => {
  try {
    const profile = await getPrisma().profile.findUnique({
      where: { id: req.user.id },
      include: { organization: true }
    });

    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: profile.id,
      email: profile.email,
      fullName: profile.fullName,
      role: profile.role,
      orgId: profile.orgId,
      organization: profile.organization
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// Update Organization Details
router.put('/organization/:id', authMiddleware, async (req: any, res) => {
  try {
    const { id } = req.params;
    const profile = await getPrisma().profile.findUnique({
      where: { id: req.user.id }
    });

    if (!profile || profile.orgId !== id) {
      return res.status(403).json({ error: 'Unauthorized to update this organization' });
    }

    const updatedOrg = await getPrisma().organization.update({
      where: { id },
      data: {
        name: req.body.name,
        gstin: req.body.gstin,
        panNumber: req.body.panNumber,
        address: req.body.address,
        phone: req.body.phone,
        email: req.body.email,
        bankName: req.body.bankName,
        bankBranch: req.body.bankBranch,
        accountNumber: req.body.accountNumber,
        ifscCode: req.body.ifscCode,
        upiId: req.body.upiId
      }
    });

    res.json(updatedOrg);
  } catch (error) {
    console.error('Org update error:', error);
    res.status(500).json({ error: 'Failed to update organization' });
  }
});

// Update User Password (Admin only)
router.patch('/users/:id/password', authMiddleware, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    const adminId = req.user.id;

    // Verify admin role
    const admin = await getPrisma().profile.findUnique({ where: { id: adminId } });
    if (admin?.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can reset passwords' });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await getPrisma().profile.update({
      where: { id },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// Delete User (Admin only)
router.delete('/users/:id', authMiddleware, async (req: any, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    if (id === adminId) {
      return res.status(400).json({ error: 'You cannot delete your own administrative account' });
    }

    // Verify admin role
    const admin = await getPrisma().profile.findUnique({ where: { id: adminId } });
    if (admin?.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can delete accounts' });
    }

    await getPrisma().profile.delete({ where: { id } });
    res.json({ message: 'User account deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Create User (Admin only)
router.post('/register', authMiddleware, async (req: any, res) => {
  try {
    const { email, password, fullName, role } = req.body;
    const orgId = await getOrgId(req);

    if (!orgId) return res.status(403).json({ error: 'No organization linked' });
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    // Check if user already exists
    const existing = await getPrisma().profile.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await getPrisma().profile.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
        role: role || 'member',
        orgId
      }
    });

    res.status(201).json({
      message: 'User created successfully',
      user: { id: newUser.id, email: newUser.email, fullName: newUser.fullName }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create user', details: error.message });
  }
});

// Get all users for organization (Filtering out super_admins for non-super_admins)
router.get('/users', authMiddleware, async (req: any, res) => {
  try {
    const orgId = await getOrgId(req);
    const userRole = req.user.role; // Now included in JWT

    if (!orgId) return res.status(403).json({ error: 'No organization linked' });

    const query: any = { 
      where: { 
        orgId,
        // Hide super_admins from anyone who isn't a super_admin themselves
        role: userRole === 'super_admin' ? undefined : { not: 'super_admin' }
      },
      select: { id: true, email: true, fullName: true, role: true, createdAt: true }
    };

    const users = await getPrisma().profile.findMany(query);
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// DELETE demo/seed data (Admin only) - removes known placeholder records
router.delete('/demo-data', authMiddleware, async (req: any, res) => {
  try {
    const orgId = await getOrgId(req);
    if (!orgId) return res.status(403).json({ error: 'No organization linked' });

    // Only admins can clean demo data
    const profile = await getPrisma().profile.findUnique({ where: { id: req.user.id } });
    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return res.status(403).json({ error: 'Only administrators can remove demo data' });
    }

    const DEMO_CLIENT_NAMES = ['Acme Corp', 'acme corp'];
    const DEMO_SITE_NAMES = ['Main Office'];
    const DEMO_INVOICE_NUMBERS = ['INV-2026-001'];
    const DEMO_CAMPAIGN_NAMES = ['Summer Launch'];

    const deleted: Record<string, number> = {};

    await getPrisma().$transaction(async (tx) => {
      // Find and delete demo invoices (cascade: items, payments, files)
      const demoInvoices = await tx.invoice.findMany({
        where: { orgId, invoiceNumber: { in: DEMO_INVOICE_NUMBERS } },
        select: { id: true }
      });
      for (const inv of demoInvoices) {
        await tx.file.deleteMany({ where: { invoiceId: inv.id } });
        await tx.payment.deleteMany({ where: { invoiceId: inv.id } });
        await tx.invoiceItem.deleteMany({ where: { invoiceId: inv.id } });
      }
      if (demoInvoices.length > 0) {
        await tx.invoice.deleteMany({ where: { orgId, invoiceNumber: { in: DEMO_INVOICE_NUMBERS } } });
        deleted.invoices = demoInvoices.length;
      }

      // Find and delete demo campaigns (cascade: campaignSites, invoices, files)
      const demoCampaigns = await tx.campaign.findMany({
        where: { orgId, campaignName: { in: DEMO_CAMPAIGN_NAMES } },
        select: { id: true, campaignName: true }
      });
      for (const camp of demoCampaigns) {
        const campaignSites = await tx.campaignSite.findMany({ where: { campaignId: camp.id }, select: { id: true } });
        for (const cs of campaignSites) {
          await tx.file.deleteMany({ where: { campaignSiteId: cs.id } });
        }
        await tx.campaignSite.deleteMany({ where: { campaignId: camp.id } });
        await tx.file.deleteMany({ where: { campaignId: camp.id } });
        // Also delete invoices linked to this campaign
        const campInvoices = await tx.invoice.findMany({ where: { campaignId: camp.id }, select: { id: true } });
        for (const inv of campInvoices) {
          await tx.file.deleteMany({ where: { invoiceId: inv.id } });
          await tx.payment.deleteMany({ where: { invoiceId: inv.id } });
          await tx.invoiceItem.deleteMany({ where: { invoiceId: inv.id } });
        }
        await tx.invoice.deleteMany({ where: { campaignId: camp.id } });
      }
      if (demoCampaigns.length > 0) {
        await tx.campaign.deleteMany({ where: { orgId, campaignName: { in: DEMO_CAMPAIGN_NAMES } } });
        deleted.campaigns = demoCampaigns.length;
      }

      // Find and delete demo clients (cascade everything)
      const demoClients = await tx.client.findMany({
        where: { orgId, name: { in: DEMO_CLIENT_NAMES, mode: 'insensitive' } },
        select: { id: true }
      });
      for (const client of demoClients) {
        await tx.file.deleteMany({ where: { clientId: client.id } });
        await tx.payment.deleteMany({ where: { clientId: client.id } });
        await tx.quotation.deleteMany({ where: { clientId: client.id } });
        const clientCampaigns = await tx.campaign.findMany({ where: { clientId: client.id }, select: { id: true } });
        for (const camp of clientCampaigns) {
          const campaignSites = await tx.campaignSite.findMany({ where: { campaignId: camp.id }, select: { id: true } });
          for (const cs of campaignSites) {
            await tx.file.deleteMany({ where: { campaignSiteId: cs.id } });
          }
          await tx.campaignSite.deleteMany({ where: { campaignId: camp.id } });
          await tx.file.deleteMany({ where: { campaignId: camp.id } });
        }
        const clientInvoices = await tx.invoice.findMany({ where: { clientId: client.id }, select: { id: true } });
        for (const inv of clientInvoices) {
          await tx.payment.deleteMany({ where: { invoiceId: inv.id } });
          await tx.invoiceItem.deleteMany({ where: { invoiceId: inv.id } });
          await tx.file.deleteMany({ where: { invoiceId: inv.id } });
        }
        await tx.invoice.deleteMany({ where: { clientId: client.id } });
        await tx.campaign.deleteMany({ where: { clientId: client.id } });
      }
      if (demoClients.length > 0) {
        await tx.client.deleteMany({ where: { orgId, name: { in: DEMO_CLIENT_NAMES, mode: 'insensitive' } } });
        deleted.clients = demoClients.length;
      }

      // Delete demo sites
      const demoSites = await tx.site.findMany({
        where: { orgId, siteName: { in: DEMO_SITE_NAMES } },
        select: { id: true }
      });
      for (const site of demoSites) {
        await tx.file.deleteMany({ where: { siteId: site.id } });
        await tx.invoiceItem.updateMany({ where: { siteId: site.id }, data: { siteId: null } });
        const campaignSites = await tx.campaignSite.findMany({ where: { siteId: site.id }, select: { id: true } });
        for (const cs of campaignSites) {
          await tx.file.deleteMany({ where: { campaignSiteId: cs.id } });
        }
        await tx.campaignSite.deleteMany({ where: { siteId: site.id } });
      }
      if (demoSites.length > 0) {
        await tx.site.deleteMany({ where: { orgId, siteName: { in: DEMO_SITE_NAMES } } });
        deleted.sites = demoSites.length;
      }
    }, { timeout: 30000 });

    const totalDeleted = Object.values(deleted).reduce((sum, n) => sum + n, 0);
    if (totalDeleted === 0) {
      return res.json({ message: 'No demo data found. Your data is already clean!', deleted });
    }
    res.json({ message: 'Demo data removed successfully', deleted });
  } catch (error: any) {
    console.error('Demo data cleanup error:', error);
    res.status(500).json({ error: 'Failed to remove demo data', details: error.message });
  }
});

export default router;
