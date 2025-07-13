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
    return (
      <NavLink to={route}>
        <Icon />
        {getDisplayLabel(key)}
      </NavLink>
    );
  }
};

// Export the main labels object for direct import (matches your original example)
export const FeatureDisplayLabels = {
  wiseGuides: "AI Instant Advice",
  experiencedGuides: "1-on-1 Human Mentors",
  councilSessions: "Group Mentoring",
  mySessions: "My Bookings",
  planUsage: "Subscription & Usage",
} as const;