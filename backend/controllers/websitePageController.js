import WebsitePageContent from '../models/WebsitePageContent.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logAdminAction } from '../utils/auditLog.js';
import { sanitizeCmsHtml, stripAllHtml } from '../utils/sanitize.js';

// @desc List all website page content entries
// @route GET /api/admin/website-pages
// @access Private/Admin
export const getWebsitePages = asyncHandler(async (req, res) => {
  const pages = await WebsitePageContent.find({}).sort({ slug: 1 });
  res.status(200).json({ success: true, pages });
});

// @desc Get a single page's content by slug (creates an empty placeholder on first access)
// @route GET /api/admin/website-pages/:slug
// @access Private/Admin
export const getWebsitePageBySlug = asyncHandler(async (req, res) => {
  const page = await WebsitePageContent.findOneAndUpdate(
    { slug: req.params.slug },
    { $setOnInsert: { slug: req.params.slug, title: req.params.slug, summary: '', body: '' } },
    { new: true, upsert: true }
  );
  res.status(200).json({ success: true, page });
});

// @desc Create/update a page's content by slug
// @route PUT /api/admin/website-pages/:slug
// @access Private/Admin
export const updateWebsitePage = asyncHandler(async (req, res) => {
  const { title, summary, body } = req.body;

  const page = await WebsitePageContent.findOneAndUpdate(
    { slug: req.params.slug },
    {
      title: stripAllHtml(title),
      summary: stripAllHtml(summary),
      body: sanitizeCmsHtml(body),
      updatedBy: req.admin.id,
    },
    { new: true, upsert: true, runValidators: true }
  );

  await logAdminAction({
    adminId: req.admin.id,
    action: 'update_website_page',
    targetType: 'WebsitePageContent',
    targetId: page._id,
    details: { slug: req.params.slug },
    ip: req.ip,
  });

  res.status(200).json({ success: true, message: 'Page updated', page });
});

// @desc Public route to get page content by slug (returns default payload if not found)
// @route GET /api/pages/:slug
// @access Public
export const getPublicWebsitePageBySlug = asyncHandler(async (req, res) => {
  const slug = req.params.slug;
  let page = await WebsitePageContent.findOne({ slug });

  if (!page) {
    const formattedTitle = slug === 'privacy-policy' ? 'Privacy Policy' : slug === 'terms-of-service' ? 'Terms of Service' : slug;
    return res.status(200).json({
      success: true,
      page: {
        slug,
        title: formattedTitle,
        summary: '',
        body: '',
      },
    });
  }

  res.status(200).json({ success: true, page });
});
