import {getWwmLocale} from '@/lib/wwm-locale';
import {WwmI18nProvider} from '@/features/when-we-meet/i18n/WwmI18nProvider';

export default async function WhenWeMeetLayout({children}:{children:React.ReactNode}){
 return <WwmI18nProvider locale={await getWwmLocale()}>{children}</WwmI18nProvider>;
}
