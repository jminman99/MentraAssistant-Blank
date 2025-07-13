// Example usage of the FeatureDisplayLabels system
import { DefaultFeatureDisplayLabels, getDisplayLabel, type LabelKey } from "./constants";

// Example: Using the labels in a component
export const ExampleUsage = {
  // Simple usage
  getWiseGuidesLabel: () => getDisplayLabel("wiseGuides"),
  
  // Menu items with labels
  menuItems: [
    { key: "wiseGuides", route: "/wise-guides", icon: "WiseIcon" },
    { key: "experiencedGuides", route: "/experienced-guides", icon: "ExperiencedIcon" },
    { key: "councilSessions", route: "/council-sessions", icon: "CouncilIcon" },
  ].map((item) => ({
    ...item,
    label: getDisplayLabel(item.key as LabelKey)
  })),

  // React component example
  renderNavLink: (key: LabelKey, route: string, icon: React.ComponentType) => {
    const Icon = icon;
    // Note: This would need proper React imports in a real component
    // Example implementation pattern for reference
    return `${route}: ${getDisplayLabel(key)}`;
  }
};

// Export the main labels object for direct import (matches your original example)
export const FeatureDisplayLabels = {
  wiseGuides: "AI Mentors",
  experiencedGuides: "1-on-1 Human Mentors",
  councilSessions: "Group Mentoring",
  mySessions: "My Bookings",
  planUsage: "Subscription & Usage",
} as const;

// Console log to verify the labels are correct
console.log("FeatureDisplayLabels loaded:", FeatureDisplayLabels);