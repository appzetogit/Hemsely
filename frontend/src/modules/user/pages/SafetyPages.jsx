import React from 'react';
import { useNavigate } from 'react-router-dom';

// Public policy pages linked from the Google Play listing (Child safety standards + Data deletion).
// Static on purpose: Play reviewers need a stable URL that works without the CMS/API.
const CONTACT_EMAIL = 'hemselyapp@gmail.com';

const font = { fontFamily: "'Inter', sans-serif" };

const PolicyLayout = ({ title, updated, children }) => {
    const navigate = useNavigate();
    return (
        <div className="min-h-screen bg-[#FCFCFC] flex flex-col max-w-[414px] mx-auto">
            <header className="relative flex items-center justify-between px-4 shrink-0 bg-[#FCFCFC] shadow-xs" style={{ height: '52px', borderRadius: '0px 0px 14px 14px' }}>
                <button type="button" aria-label="Go back" onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', padding: '10px', cursor: 'pointer' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M15 18L9 12L15 6" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <h1 style={{ ...font, fontWeight: 600, fontSize: '18px', color: '#000', opacity: 0.9 }}>{title}</h1>
                <div className="w-[44px]" />
            </header>
            <main className="flex-1 px-6 pt-8 pb-10 text-sm leading-relaxed text-black" style={font}>
                <h2 style={{ fontWeight: 700, fontSize: '24px', lineHeight: '30px', marginBottom: '4px' }}>{title}</h2>
                <p className="text-gray-500 mb-6">Last updated: {updated}</p>
                <div className="flex flex-col gap-5">{children}</div>
            </main>
        </div>
    );
};

const Section = ({ heading, children }) => (
    <section>
        <h3 style={{ fontWeight: 600, fontSize: '16px', marginBottom: '6px' }}>{heading}</h3>
        {children}
    </section>
);

const Mail = ({ subject }) => (
    <a className="text-[#6F3BCE] font-semibold underline" href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`}>
        {CONTACT_EMAIL}
    </a>
);

export const ChildSafetyPage = () => (
    <PolicyLayout title="Child Safety Standards" updated="November 2026">
        <p>
            Hemsely has zero tolerance for child sexual abuse and exploitation (CSAE) and child sexual abuse
            material (CSAM). This page describes the standards we enforce and how to report a concern.
        </p>

        <Section heading="1. Adults only (18+)">
            <p>
                Hemsely is a dating app strictly for people aged 18 and over. Users must provide their age at sign-up
                and profiles under 18 cannot be created. Accounts found to belong to anyone under 18 are permanently
                removed.
            </p>
        </Section>

        <Section heading="2. Prohibited content and behaviour">
            <ul className="list-disc pl-5 flex flex-col gap-1">
                <li>Any content that sexualises, exploits or endangers minors, including CSAM in photos, messages or voice notes.</li>
                <li>Grooming, solicitation or any attempt to contact a minor for sexual purposes.</li>
                <li>Sharing, requesting or linking to such material, on or off the app.</li>
            </ul>
            <p className="mt-2">Violations result in immediate and permanent account removal.</p>
        </Section>

        <Section heading="3. How we prevent abuse">
            <ul className="list-disc pl-5 flex flex-col gap-1">
                <li>Selfie verification to confirm users are real people.</li>
                <li>Moderation of profile photos by our admin team.</li>
                <li>In-app tools to block and report any user at any time.</li>
                <li>Every report is reviewed by our team, with child-safety reports prioritised.</li>
            </ul>
        </Section>

        <Section heading="4. How to report">
            <p>
                <strong>In the app:</strong> open the user's profile or chat, tap Report, and choose
                <em> "Underage user (under 18)"</em> or <em>"Inappropriate content"</em>.
            </p>
            <p className="mt-2">
                <strong>By email:</strong> write to <Mail subject="Child safety report" /> with the profile name and
                details. You do not need an account to report.
            </p>
        </Section>

        <Section heading="5. Cooperation with authorities">
            <p>
                When we become aware of CSAM or a child at risk, we remove the content, preserve relevant records and
                report it to the appropriate authorities, including the National Center for Missing &amp; Exploited
                Children (NCMEC) and Indian law enforcement via the National Cyber Crime Reporting Portal
                (cybercrime.gov.in). We comply with all applicable child safety laws.
            </p>
        </Section>

        <Section heading="6. Child safety contact">
            <p>
                Our designated point of contact for child safety and CSAM prevention can be reached at{' '}
                <Mail subject="Child safety contact" />.
            </p>
        </Section>
    </PolicyLayout>
);

export const DeleteAccountPage = () => (
    <PolicyLayout title="Delete Your Account" updated="November 2026">
        <p>
            This page explains how to delete your <strong>Hemsely</strong> account and the data associated with it.
        </p>

        <Section heading="Option 1: Delete from the app">
            <ol className="list-decimal pl-5 flex flex-col gap-1">
                <li>Open the Hemsely app and log in.</li>
                <li>Go to <strong>Profile → Settings</strong>.</li>
                <li>Tap <strong>Delete Account</strong>.</li>
                <li>Enter the OTP sent to your phone number to confirm.</li>
            </ol>
        </Section>

        <Section heading="Option 2: Request by email">
            <p>
                If you can't access the app, email <Mail subject="Account deletion request" /> from any address with
                the subject "Account deletion request" and include the phone number registered with Hemsely. We may
                ask you to confirm ownership of the number before deleting the account. Requests are processed within
                7 days.
            </p>
        </Section>

        <Section heading="What gets deleted">
            <p>
                Your profile (including photos, selfie verification and location), likes, matches, chats and voice
                messages are deleted and can no longer be seen by anyone on Hemsely.
            </p>
        </Section>

        <Section heading="What we keep, and for how long">
            <ul className="list-disc pl-5 flex flex-col gap-1">
                <li>Purchase and transaction records, kept for up to 8 years where required by tax and accounting law.</li>
                <li>Records of reports and bans, kept to prevent abuse and fraud and to meet legal obligations.</li>
            </ul>
        </Section>

        <Section heading="Purchases">
            <p>
                Deleting your account does not refund Premium or Boost purchases. Refunds for Google Play purchases
                are handled through Google Play.
            </p>
        </Section>
    </PolicyLayout>
);
