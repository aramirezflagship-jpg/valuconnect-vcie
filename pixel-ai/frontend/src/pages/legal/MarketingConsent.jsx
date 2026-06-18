import LegalPage from './LegalPage.jsx';
import { MARKETING } from '../../legal/legalContent.js';

export default function MarketingConsent() {
  return <LegalPage doc={MARKETING} />;
}
