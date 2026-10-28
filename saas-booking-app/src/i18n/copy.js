import en from './en';
import es from './es';
import { getUiLanguage } from './language';

// The owner's interface copy by language (see LanguageContext for components).
export const COPY = { en, es };

// For code outside components, such as contexts reporting an error.
export const uiCopy = () => COPY[getUiLanguage()];
