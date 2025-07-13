import { FeatureDisplayLabels } from "@/lib/feature-labels";
import { Link } from "wouter";

// Example implementation exactly as you specified
const menuItems = [
  { key: "wiseGuides", route: "/wise-guides", icon: "WiseIcon" },
  { key: "experiencedGuides", route: "/experienced-guides", icon: "ExperiencedIcon" },
  { key: "councilSessions", route: "/council-sessions", icon: "CouncilIcon" },
  { key: "mySessions", route: "/my-sessions", icon: "SessionsIcon" },
  { key: "planUsage", route: "/plan-usage", icon: "PlanIcon" },
];

export function ExampleNavigation() {
  return (
    <nav>
      {menuItems.map((item) => (
        <Link key={item.key} to={item.route}>
          {/* Replace with actual icon component */}
          <span className="icon">{item.icon}</span>
          {FeatureDisplayLabels[item.key as keyof typeof FeatureDisplayLabels]}
        </Link>
      ))}
    </nav>
  );
}

// This shows the exact pattern you wanted:
// import { FeatureDisplayLabels } from "./constants";
// 
// const menuItems = [
//   { key: "wiseGuides", route: "/wise-guides", icon: WiseIcon },
//   { key: "experiencedGuides", route: "/experienced-guides", icon: ExperiencedIcon },
//   { key: "councilSessions", route: "/council-sessions", icon: CouncilIcon },
//   ...
// ];
// 
// menuItems.map((item) => (
//   <NavLink to={item.route}>
//     {item.icon}
//     {FeatureDisplayLabels[item.key]}
//   </NavLink>
// ));