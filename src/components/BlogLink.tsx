import { useSyncExternalStore, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  blogNavigationHref,
  portfolioOriginSnapshot,
  subscribePortfolioOrigin,
} from "../share/articleShareUrl";

export function BlogLink({
  to,
  className,
  children,
}: {
  to: string;
  className?: string;
  children: ReactNode;
}) {
  const portfolioOrigin = useSyncExternalStore(
    subscribePortfolioOrigin,
    portfolioOriginSnapshot,
    portfolioOriginSnapshot,
  );
  const nav = blogNavigationHref(to, portfolioOrigin);
  if (nav.external) {
    return (
      <a href={nav.href} target="_top" className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link to={nav.href} className={className}>
      {children}
    </Link>
  );
}
