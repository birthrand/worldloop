export type LegalDocumentSection = {
  id: string;
  title: string;
  paragraphs: string[];
};

export type LegalDocument = {
  id: string;
  title: string;
  sections: LegalDocumentSection[];
};

export type LegalDocumentId =
  | "privacy-policy"
  | "terms-of-service"
  | "data-and-cookies";

export const LEGAL_DOCUMENTS: Record<LegalDocumentId, LegalDocument> = {
  "privacy-policy": {
    id: "privacy-policy",
    title: "Privacy policy",
    sections: [
      {
        id: "introduction",
        title: "Introduction",
        paragraphs: [
          "WorldLoop helps you discover countries through swipeable feeds, maps, landmarks, and AI-generated facts. This privacy policy explains what information the app uses and how it is handled.",
          "WorldLoop is built as a learning and portfolio project. The practices below describe the current app behavior and may evolve as features are added.",
        ],
      },
      {
        id: "information-we-collect",
        title: "Information we collect",
        paragraphs: [
          "Account information: when you sign in with Clerk, we receive basic profile details such as your name, email address, and profile photo from your authentication provider.",
          "App activity: WorldLoop stores discovery progress locally on your device — for example saved countries, visited countries, bookmarks, and settings such as language preferences.",
          "Usage data: the app may send anonymous or aggregated usage events to analytics tools in future versions. This v1 build focuses on on-device state and backend API calls needed to load content.",
        ],
      },
      {
        id: "how-we-use-information",
        title: "How we use information",
        paragraphs: [
          "We use account information to personalize your profile and keep you signed in.",
          "We use local app data to restore your saved places, visited countries, and preferences between sessions.",
          "We use country and landmark requests to fetch public content (images, facts, map data) through our backend so API keys stay secure.",
        ],
      },
      {
        id: "third-party-services",
        title: "Third-party services",
        paragraphs: [
          "WorldLoop relies on third-party services including Clerk (authentication), REST Countries and related public data APIs, image providers such as Unsplash and Pexels, Wikipedia, OpenStreetMap, and optional AI services accessed through our backend.",
          "Each provider has its own privacy policy. We only send the minimum data required to retrieve content or authenticate your session.",
        ],
      },
      {
        id: "data-storage",
        title: "Data storage and security",
        paragraphs: [
          "Most personalization data is stored on your device using AsyncStorage and Zustand persistence. Backend services cache public content to improve performance.",
          "We do not sell your personal information. Protect your device and sign-out when using shared devices.",
        ],
      },
      {
        id: "your-choices",
        title: "Your choices",
        paragraphs: [
          "You can sign out at any time from Profile → Settings. Clearing app data on your device removes locally stored preferences and discovery progress.",
          "For account-related requests (email change, deletion), use your Clerk account settings or contact support from the Help center.",
        ],
      },
      {
        id: "contact",
        title: "Contact",
        paragraphs: [
          "Questions about this policy can be sent to birthrand@gmail.com from Profile → Settings → Help center → Contact support.",
        ],
      },
    ],
  },
  "terms-of-service": {
    id: "terms-of-service",
    title: "Terms of service",
    sections: [
      {
        id: "acceptance",
        title: "Acceptance of terms",
        paragraphs: [
          "By using WorldLoop, you agree to these terms of service. If you do not agree, please do not use the app.",
          "WorldLoop is provided for educational and portfolio purposes. Features may change between app versions.",
        ],
      },
      {
        id: "eligibility",
        title: "Eligibility",
        paragraphs: [
          "You must be able to form a binding agreement in your jurisdiction to use WorldLoop. If you are under the age required in your region, you may use the app only with permission from a parent or guardian.",
        ],
      },
      {
        id: "accounts",
        title: "Accounts",
        paragraphs: [
          "You are responsible for activity on your account and for keeping your sign-in credentials secure.",
          "Authentication is handled by Clerk. You agree to provide accurate account information and to notify us if you suspect unauthorized access.",
        ],
      },
      {
        id: "app-content",
        title: "App content",
        paragraphs: [
          "Country facts, images, landmarks, and AI-generated text are provided for discovery and learning. They may be incomplete, outdated, or inaccurate and should not be relied on for travel, legal, medical, or safety decisions.",
          "Media and data from third parties remain subject to each provider's terms of use.",
        ],
      },
      {
        id: "acceptable-use",
        title: "Acceptable use",
        paragraphs: [
          "Do not misuse WorldLoop, attempt to reverse engineer protected services, scrape content at scale, or interfere with other users' access.",
          "Do not use the app to upload or distribute unlawful, harmful, or infringing material.",
        ],
      },
      {
        id: "disclaimer",
        title: "Disclaimer",
        paragraphs: [
          'WorldLoop is provided "as is" without warranties of any kind. We do not guarantee uninterrupted service, error-free content, or that the app will meet your expectations.',
        ],
      },
      {
        id: "limitation",
        title: "Limitation of liability",
        paragraphs: [
          "To the fullest extent permitted by law, WorldLoop and its contributors are not liable for indirect, incidental, or consequential damages arising from your use of the app.",
        ],
      },
      {
        id: "changes",
        title: "Changes to these terms",
        paragraphs: [
          "We may update these terms as the project evolves. Continued use after updates means you accept the revised terms. The last updated date is shown on each legal screen.",
        ],
      },
    ],
  },
  "data-and-cookies": {
    id: "data-and-cookies",
    title: "Data & cookies",
    sections: [
      {
        id: "overview",
        title: "Overview",
        paragraphs: [
          "This page describes how WorldLoop handles data on your device, what is sent to our backend, and how web-style cookies relate to the mobile app.",
        ],
      },
      {
        id: "on-device-data",
        title: "On-device data",
        paragraphs: [
          "WorldLoop stores preferences and discovery state locally — including saved countries, visited countries, map session choices, and profile settings — using AsyncStorage and Zustand.",
          "This data stays on your device unless a future cloud sync feature is explicitly enabled.",
        ],
      },
      {
        id: "backend-requests",
        title: "Backend requests",
        paragraphs: [
          "When you browse countries, landmarks, or AI facts, the app calls our backend, which may cache responses in Redis to reduce repeated external API calls.",
          "These requests typically include country names, coordinates, or content identifiers — not sensitive payment or health information.",
        ],
      },
      {
        id: "authentication-tokens",
        title: "Authentication tokens",
        paragraphs: [
          "Clerk manages secure session tokens for sign-in. Tokens are stored using Expo SecureStore patterns recommended for React Native and are used only to authenticate API calls tied to your account.",
        ],
      },
      {
        id: "cookies-and-similar",
        title: "Cookies and similar technologies",
        paragraphs: [
          "The native WorldLoop app does not set browser cookies in the same way a website does.",
          "If you use WorldLoop on web in the future, standard session cookies or local storage may be used by Clerk or hosting providers to keep you signed in. Third-party embedded content may use its own tracking technologies.",
        ],
      },
      {
        id: "analytics",
        title: "Analytics",
        paragraphs: [
          "Analytics may be added in later lessons to understand feature usage. When enabled, we will describe what is collected and provide opt-out controls where required.",
        ],
      },
      {
        id: "managing-data",
        title: "Managing your data",
        paragraphs: [
          "Sign out from Settings to end your session on the device. Uninstalling the app removes local WorldLoop data from that device.",
          "For privacy questions, contact birthrand@gmail.com via Help center → Contact support.",
        ],
      },
    ],
  },
};

export function getLegalDocument(id: LegalDocumentId): LegalDocument {
  return LEGAL_DOCUMENTS[id];
}
