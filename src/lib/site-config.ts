export interface SiteConfig {
  id: string;
  name: string;
  shortName: string;
  tagline: string;
  domain: string;
  logoPath: string;
  logoAlt: string;
  colors: {
    primary50: string;
    primary100: string;
    primary200: string;
    primary300: string;
    primary400: string;
    primary500: string;
    primary600: string;
    primary700: string;
    primary800: string;
    primary900: string;
    accent500: string;
    accent600: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  og: {
    siteName: string;
    description: string;
    image: string;
  };
  legal: {
    companyName: string;
    companyEmail: string;
    copyrightName: string;
  };
  email: {
    fromName: string;
    fromAddress: string;
    gradientStart: string;
    gradientEnd: string;
    buttonColor: string;
  };
  portal: {
    title: string;
  };
  hero: {
    title: string;
    titleAccent: string;
    subtitle: string;
  };
  cta: {
    title: string;
    subtitle: string;
    primaryButton: string;
  };
  citiesSection: {
    subtitle: string;
  };
  stats: {
    marketsLabel: string;
  };
}

const configs: Record<string, SiteConfig> = {
  distinct: {
    id: "distinct",
    name: "Harmon's Distinctive Homes",
    shortName: "DistinctHomes",
    tagline: "Find Your Perfect Luxury Home",
    domain: "distincthomes.com",
    logoPath: "/logos/distinct-logo.png",
    logoAlt: "Harmon's Distinctive Homes",
    colors: {
      primary50: "#f0f7ff",
      primary100: "#e0efff",
      primary200: "#b9dfff",
      primary300: "#7cc4ff",
      primary400: "#36a5ff",
      primary500: "#0c87f2",
      primary600: "#0068d0",
      primary700: "#0052a8",
      primary800: "#04468a",
      primary900: "#0a3c72",
      accent500: "#f97066",
      accent600: "#e54d3f",
    },
    fonts: {
      heading: "var(--font-playfair)",
      body: "var(--font-inter)",
    },
    og: {
      siteName: "Harmon's Distinctive Homes",
      description:
        "Search thousands of premier homes for sale and rent. Find your perfect luxury property with our easy-to-use map search and detailed listings.",
      image: "/logos/distinct-logo.png",
    },
    legal: {
      companyName: "Harmon Worldwide, LLC",
      companyEmail: "info@distincthomes.com",
      copyrightName: "Harmon's Distinctive Homes",
    },
    email: {
      fromName: "DistinctiveHomes",
      fromAddress: "onboarding@resend.dev",
      gradientStart: "#1e40af",
      gradientEnd: "#3b82f6",
      buttonColor: "#2563eb",
    },
    portal: {
      title: "DistinctHomes Agent Portal",
    },
    hero: {
      title: "Find Your Perfect",
      titleAccent: "Luxury Home",
      subtitle:
        "Discover beautiful luxury properties. Your dream starts here.",
    },
    cta: {
      title: "Find Your Perfect Luxury Home",
      subtitle:
        "Start your search today and discover distinctive properties in the most desirable neighborhoods.",
      primaryButton: "Start Searching",
    },
    citiesSection: {
      subtitle:
        "Explore distinctive properties in sought-after markets across the country",
    },
    stats: {
      marketsLabel: "Premier Markets",
    },
  },
  harmon: {
    id: "harmon",
    name: "HarmonHomes",
    shortName: "HarmonHomes",
    tagline: "Your Home, Your Way",
    domain: "harmonhomes.com",
    logoPath: "/logos/harmon-logo.png",
    logoAlt: "HarmonHomes",
    colors: {
      primary50: "#f0fdf4",
      primary100: "#dcfce7",
      primary200: "#bbf7d0",
      primary300: "#86efac",
      primary400: "#4ade80",
      primary500: "#22c55e",
      primary600: "#16a34a",
      primary700: "#15803d",
      primary800: "#166534",
      primary900: "#14532d",
      accent500: "#f97066",
      accent600: "#e54d3f",
    },
    fonts: {
      heading: "var(--font-playfair)",
      body: "var(--font-inter)",
    },
    og: {
      siteName: "HarmonHomes",
      description:
        "Search thousands of homes for sale and rent. Find your perfect property with our easy-to-use map search and detailed listings.",
      image: "/logos/harmon-logo.png",
    },
    legal: {
      companyName: "Harmon Worldwide, LLC",
      companyEmail: "info@harmonhomes.com",
      copyrightName: "HarmonHomes",
    },
    email: {
      fromName: "HarmonHomes",
      fromAddress: "onboarding@resend.dev",
      gradientStart: "#166534",
      gradientEnd: "#22c55e",
      buttonColor: "#16a34a",
    },
    portal: {
      title: "HarmonHomes Agent Portal",
    },
    hero: {
      title: "Find Your Perfect",
      titleAccent: "Dream Home",
      subtitle:
        "Discover beautiful properties across the country. Your home search starts here.",
    },
    cta: {
      title: "Find Your Dream Home Today",
      subtitle:
        "Start your search today and discover properties at every price point in the best neighborhoods.",
      primaryButton: "Start Searching",
    },
    citiesSection: {
      subtitle:
        "Browse properties in popular markets across the country",
    },
    stats: {
      marketsLabel: "Active Markets",
    },
  },
};

export function getSiteId(): string {
  return process.env.NEXT_PUBLIC_SITE_ID || "distinct";
}

export const siteConfig: SiteConfig =
  configs[getSiteId()] || configs.distinct;

export function getSiteConfig(siteId?: string): SiteConfig {
  return configs[siteId || getSiteId()] || configs.distinct;
}
