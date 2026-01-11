/**
 * M Practice Manager Branding Header
 * Unified branding component for all auth pages
 */

export default function BrandingHeader() {
  return (
    <div className="mpm-full-container">
      <img 
        src="/mdj_goldlogo.png"
        alt="M Practice Manager Logo" 
        className="mpm-logo"
      />
      <div className="mpm-text-block">
        <div className="mpm-text-practice">PRACTICE</div>
        <div className="mpm-text-manager">MANAGER</div>
      </div>
    </div>
  );
}
