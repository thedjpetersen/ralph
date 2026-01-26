import './PageLoadingSpinner.css';

export function PageLoadingSpinner() {
  return (
    <div className="page-loading-spinner">
      <div className="page-loading-spinner__container">
        <div className="page-loading-spinner__ring" />
        <span className="page-loading-spinner__text">Loading...</span>
      </div>
    </div>
  );
}
