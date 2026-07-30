export const websitePageSections = [
    {
        title: 'Legal',
        items: [
            {
                slug: 'privacy-policy',
                title: 'Privacy Policy',
                description: 'Explain how user data is collected, stored, and used.',
            },
            {
                slug: 'terms-of-service',
                title: 'Terms of Services',
                description: 'Set rules, responsibilities, and platform usage terms.',
            },
        ],
    },
];

export const websitePages = websitePageSections.flatMap((section) =>
    section.items.map((item) => ({
        ...item,
        section: section.title,
    }))
);

export const websitePagesBySlug = Object.fromEntries(
    websitePages.map((page) => [page.slug, page])
);
