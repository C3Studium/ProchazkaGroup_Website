import {
  Text,
  Column,
  Container,
  Heading,
  Html,
  Img,
  Row,
  Section,
  Tailwind,
  Head,
  Preview,
  Body,
  Link
} from "@react-email/components"

function ZajemUserEmailComponent({
  name,
  email,
  phone_number,
  consultant_name,
  message,
  inquiryDate,
  personalizedGreeting,
  segment = "new"
}) {
  const formatDate = (date) => {
    if (!date) return new Date().toLocaleDateString('cs-CZ')
    return new Date(date).toLocaleDateString('cs-CZ')
  }

  const getServiceSpecificContent = (consultant_name) => {
    const services = {
      "Jan Procházka": {
        value: "Kompletní finanční plán na míru",
        benefit: "Ušetřete až 30% na poplatcích ročně",
        urgency: "Prvních 10 klientů měsíce získá plán ZDARMA"
      },
      "Marie Svobodová": {
        value: "Profesionální investiční strategie",
        benefit: "Průměrný výnos 12% ročně",
        urgency: "Speciální podmínky pro nové klienty"
      },
      "Petr Novák": {
        value: "Nejlepší hypotéční podmínky",
        benefit: "Ušetřete až 200 000 Kč na poplatcích",
        urgency: "Sazby se mění - zajistěte si je teď"
      }
    }
    return services[consultant_name] || {
      value: "Profesionální finanční služby",
      benefit: "Individuální přístup a maximální úspora",
      urgency: "Kontaktujte nás co nejdříve"
    }
  }

  const serviceContent = getServiceSpecificContent(consultant_name)

  return (
    <Tailwind>
      <Html className="font-sans" style={{ fontFamily: 'Satoshi, sans-serif' }}>
        <Head>
          <link rel="stylesheet" href="https://prochazka.group/css/satoshi.css" />
          <link rel="stylesheet" href="https://prochazka.group/css/switzer.css" />
        </Head>
        <Preview>Vaše poptávka přijata! - Procházka Group</Preview>
        <Body className="mx-auto w-full max-w-2xl tablet:max-w-3xl" style={{ backgroundColor: '#063F66' }}>
          {/* Enhanced Header with Trust Signals */}
          <Section className="text-white px-6 py-8 tablet:px-8 tablet:py-10 relative overflow-hidden" style={{ background: 'linear-gradient(to right, #9151e0, #4bdadc)' }}>
            <div className="absolute inset-0 opacity-90" style={{ background: 'linear-gradient(to right, #9151e0, #4bdadc)' }}></div>
            <div className="relative z-10">
              <Heading className="font-bold m-0 mb-2 text-3xl tablet:text-4xl" style={{ fontSize: '34px', fontFamily: 'Switzer, sans-serif' }}>
                Procházka Group
              </Heading>
              <Text className="m-0 text-sm tablet:text-base" style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>
                ✅ Důvěryhodný finanční partner • 15+ let zkušeností • 5000+ spokojených klientů
              </Text>
            </div>
          </Section>

          {/* Main Content */}
          <Container className="p-6 tablet:p-8" style={{ backgroundColor: '#050A10' }}>
            <Heading className="font-light text-center mb-1 text-4xl tablet:text-5xl" style={{ color: '#fff', fontFamily: 'Switzer, sans-serif' }}>
              {personalizedGreeting || `Dobrý den ${name}!`}
            </Heading>

            <Text className="text-center mb-8 text-lg tablet:text-xl" style={{ color: '#4bdadc'}}>
              Děkujeme za váš zájem o naše služby. Vaše poptávka je u nás v nejlepších rukou.
            </Text>

            {/* Success Confirmation with Value Proposition */}
            <Section className="border rounded-xl p-6 tablet:p-8 mb-8 tablet:mb-10 shadow-sm hover:shadow-lg transition-all duration-200" style={{ background: 'linear-gradient(to right, rgba(75, 218, 220, 0.1), rgba(145, 81, 224, 0.1))', borderColor: '#4bdadc' }}>
              <div className="text-center mb-6 tablet:mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 tablet:w-20 tablet:h-20 rounded-full mb-4" style={{ backgroundColor: 'rgba(75, 218, 220, 0.2)' }}>
                  <Text className="text-3xl tablet:text-4xl" style={{ color: '#4bdadc' }}>✅</Text>
                </div>
                <Heading className="font-light mb-2 text-xl tablet:text-2xl" style={{ color: '#4bdadc', fontFamily: 'Switzer, sans-serif' }}>
                  Vaše poptávka byla úspěšně přijata!
                </Heading>
              </div>

              <Text className="m-0 text-center leading-relaxed mb-4 text-base text-lg tablet:text-lg" style={{ color: '#fff'}}>
                Obdrželi jsme váš zájem o naše služby
                {/* Obdrželi jsme váš zájem o naše služby a připravujeme pro vás
                personalizovanou nabídku s {serviceContent.benefit}. */}
              </Text>

              <Section className="rounded-lg p-4 tablet:p-6" style={{ backgroundColor: '#063F66', borderLeft: '4px solid #4bdadc' }}>
                <Text className="m-0 font-semibold text-center text-sm tablet:text-base" style={{ color: '#4bdadc', fontSize: '13px' }}>
                  📞 Kontaktujeme vás do 24 hodin během pracovních dnů
                </Text>
              </Section>
            </Section>

            {/* Service-Specific Value Proposition */}
            {/* <Section className="border rounded-xl p-6 tablet:p-8 mb-8 tablet:mb-10 shadow-sm hover:shadow-lg transition-all duration-200" style={{ backgroundColor: 'rgba(75, 218, 220, 0.1)', borderColor: '#4bdadc' }}>
              <Heading className="font-bold mb-4 tablet:mb-6 text-center text-2xl tablet:text-3xl" style={{ color: '#4bdadc', fontSize: '34px', fontFamily: 'Switzer, sans-serif' }}>
                🎯 Co pro vás připravujeme
              </Heading>

              <div className="rounded-lg p-4 tablet:p-6" style={{ backgroundColor: '#063F66', borderLeft: '4px solid #4bdadc' }}>
                <Heading className="font-semibold mb-3 tablet:mb-4 text-lg tablet:text-xl" style={{ color: '#fff', fontSize: '21px', fontFamily: 'Switzer, sans-serif' }}>
                  {serviceContent.value}
                </Heading>
                <Text className="m-0 mb-4 tablet:mb-6 text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>
                  {serviceContent.benefit}. Naši specialisté analyzují váš požadavek
                  a připraví řešení šité na míru vašim potřebám.
                </Text>

                <div className="rounded-lg p-3 tablet:p-4" style={{ backgroundColor: 'rgba(75, 218, 220, 0.1)' }}>
                  <Text className="m-0 font-semibold text-sm tablet:text-base" style={{ color: '#4bdadc', fontSize: '13px' }}>
                    ⚡ {serviceContent.urgency}
                  </Text>
                </div>
              </div>
            </Section> */}

            {/* Multiple Contact Options - HIGH CONVERSION FOCUS */}
            <Section className="text-white rounded-xl p-6 tablet:p-8 mb-8 tablet:mb-10" style={{ backgroundColor: '#050A10' }}>
              <Heading className="font-light text-center mb-6 tablet:mb-8 text-xl tablet:text-2xl" style={{ color: '#fff', fontFamily: 'Switzer, sans-serif' }}>
                🚀 Chcete urychlit proces? Kontaktujte nás ihned:
              </Heading>

              <div className="space-y-4 tablet:space-y-6">
                {/* WhatsApp - HIGHEST CONVERSION */}
                {/* <Row className="mb-4 tablet:mb-6">
                  <Column className="w-full">
                    <Link
                      href={`https://wa.me/420123456789?text=Ahoj ${name}, právě jsem odeslal poptávku na naše služby a rád bych mluvil s ${consultant_name || 'naším specialistou'}.`}
                      className="px-6 py-4 tablet:px-8 tablet:py-5 rounded-lg font-bold inline-block transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 w-full text-center text-sm tablet:text-base"
                      style={{ backgroundColor: '#4bdadc', color: '#050A10', fontSize: '13px', textDecoration: 'none', cursor: "pointer" }}
                    >
                      💬 WhatsApp (nejrychlejší odpověď)
                    </Link>
                  </Column>
                </Row> */}

                {/* Phone Call - SECOND HIGHEST CONVERSION */}
                <Row className="mb-4 tablet:mb-6">
                  <Column className="w-full tablet:w-1/2 mb-4 tablet:mb-0 tablet:pr-2 flex items-center justify-center">
                    <Link
                      href="tel:+420705500200"
                      className="px-4 py-4 tablet:px-6 tablet:py-5 rounded-lg font-bold inline-block transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 w-full text-center text-sm tablet:text-base max-w-[200px] min-w-[150px]"
                      style={{ backgroundColor: '#9151e0', color: '#fff', fontSize: '13px', textDecoration: 'none', cursor: "pointer" }}
                    >
                      📞 Zavolat teď
                    </Link>
                  </Column>
                </Row>
                {/* <Row>
                    <Column className="w-full tablet:w-1/2 tablet:pl-2 flex items-center justify-center">
                        <Link
                        href="sms:+420123456789"
                        className="px-4 py-4 tablet:px-6 tablet:py-5 rounded-lg font-bold inline-block transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 w-full text-center text-sm tablet:text-base max-w-[200px] min-w-[150px]"
                        style={{ backgroundColor: '#5E758D', color: '#fff', fontSize: '13px', textDecoration: 'none', cursor: "pointer" }}
                        >
                        💬 SMS
                        </Link>
                    </Column>
                </Row> */}
              </div>

              {/* <Text className="text-center mt-4 tablet:mt-6 text-sm tablet:text-base" style={{ color: '#5E758D', fontSize: '13px' }}>
                💡 Tip: WhatsApp a telefon mají nejrychlejší odezvu - často do 5 minut!
              </Text> */}
            </Section>

            {/* Inquiry Summary */}
            <Section className="rounded-lg p-6 tablet:p-8 mb-8 tablet:mb-10 shadow-sm hover:shadow-lg transition-all duration-200" style={{ backgroundColor: 'rgba(117, 171, 192, 0.1)' }}>
              <Heading className="font-semibold mb-4 tablet:mb-6 text-lg tablet:text-xl" style={{ color: '#fff', fontSize: '21px', fontFamily: 'Switzer, sans-serif' }}>
                📝 Shrnutí vaší poptávky
              </Heading>

              <Row className="mb-3 tablet:mb-4">
                <Column className="w-full tablet:w-1/3 mb-2 tablet:mb-0">
                  <Text className="font-semibold m-0 text-sm tablet:text-base" style={{ color: '#4bdadc', fontSize: '13px' }}>Konzultant:</Text>
                </Column>
                <Column className="w-full tablet:w-2/3">
                  <Text className="m-0 text-sm tablet:text-base whitespace-nowrap" style={{ color: '#fff', fontSize: '13px' }}>{consultant_name || 'Nezadáno'}</Text>
                </Column>
              </Row>

              <Row>
                <Column className="w-full tablet:w-1/3 mb-2 tablet:mb-0">
                  <Text className="font-semibold m-0 text-sm tablet:text-base" style={{ color: '#4bdadc', fontSize: '13px' }}>Datum:</Text>
                </Column>
                <Column className="w-full tablet:w-2/3">
                  <Text className="m-0 text-sm tablet:text-base whitespace-nowrap" style={{ color: '#fff', fontSize: '13px' }}>{formatDate(inquiryDate)}</Text>
                </Column>
              </Row>
            </Section>

            {/* Next Steps with Timeline */}
            <Section className="border rounded-xl p-6 tablet:p-8 mb-8 tablet:mb-10 shadow-sm hover:shadow-lg transition-all duration-200" style={{ backgroundColor: 'rgba(145, 81, 224, 0.1)', borderColor: '#9151e0' }}>
              <Heading className="font-semibold mb-4 tablet:mb-6 text-lg tablet:text-xl" style={{ color: '#9151e0', fontSize: '21px', fontFamily: 'Switzer, sans-serif' }}>
                ⏰ Co se bude dít dále?
              </Heading>

              <div className="space-y-3 tablet:space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 tablet:w-8 tablet:h-8 rounded-full flex items-center justify-center text-white text-sm tablet:text-base font-bold" style={{ backgroundColor: '#4bdadc', fontSize: '13px' }}>1</div>
                  <Text className="m-0 text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>Váš vybraný Poradce se Vám ozve do 24 hodin.</Text>
                </div>
                {/* <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 tablet:w-8 tablet:h-8 rounded-full flex items-center justify-center text-white text-sm tablet:text-base font-bold" style={{ backgroundColor: '#5E758D', fontSize: '13px' }}>2</div>
                  <Text className="m-0 text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>Kontaktujeme vás s personalizovanou nabídkou</Text>
                </div> */}
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 tablet:w-8 tablet:h-8 rounded-full flex items-center justify-center text-white text-sm tablet:text-base font-bold" style={{ backgroundColor: '#5E758D', fontSize: '13px' }}>3</div>
                  <Text className="m-0 text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>Domluvíte si první termín schůzky</Text>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 tablet:w-8 tablet:h-8 rounded-full flex items-center justify-center text-white text-sm tablet:text-base font-bold" style={{ backgroundColor: '#5E758D', fontSize: '13px' }}>4</div>
                  <Text className="m-0 text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>Začnete ve spolupráci na vašem řešení k lepší finanční situace</Text>
                </div>
              </div>
            </Section>

            {/* Social Proof & Trust Signals */}
            <Section className="border rounded-xl p-6 tablet:p-8 mb-8 tablet:mb-10 shadow-sm hover:shadow-lg transition-all duration-200" style={{ backgroundColor: 'rgba(75, 218, 220, 0.1)', borderColor: '#4bdadc' }}>
              <Heading className="font-semibold mb-4 tablet:mb-6 text-center text-lg tablet:text-xl" style={{ color: '#4bdadc', fontSize: '21px', fontFamily: 'Switzer, sans-serif' }}>
                ⭐ Proč si nás klienti vybírají?
              </Heading>

              <div className="space-y-3 tablet:space-y-4">
                <div className="flex items-center space-x-3">
                  <Text className="font-bold text-sm tablet:text-base" style={{ color: '#4bdadc', fontSize: '13px' }}>99%</Text>
                  <Text className="m-0 text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>klientů doporučuje naše služby</Text>
                </div>
                <div className="flex items-center space-x-3">
                  <Text className="font-bold text-sm tablet:text-base" style={{ color: '#4bdadc', fontSize: '13px' }}>15+</Text>
                  <Text className="m-0 text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>let zkušeností na trhu</Text>
                </div>
                <div className="flex items-center space-x-3">
                  <Text className="font-bold text-sm tablet:text-base" style={{ color: '#4bdadc', fontSize: '13px' }}>12/7</Text>
                  <Text className="m-0 text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>dostupnost pro urgentní případy</Text>
                </div>
              </div>
            </Section>

            {/* Strategic CTA */}
            <Section className="text-center mb-8 tablet:mb-10">
              <div className="space-y-4 tablet:space-y-6">
                <Link
                  href="https://prochazka.group/kontakt"
                  className="px-8 py-4 tablet:px-10 tablet:py-5 rounded-lg font-bold inline-block transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm tablet:text-base"
                  style={{ backgroundColor: '#9151e0', color: '#fff', fontSize: '13px', textDecoration: 'none', cursor: "pointer" }}
                >
                  📞 Domluvit si schůzku online
                </Link>

                <div className="text-center">
                  <Text className="mb-2 tablet:mb-3 text-sm tablet:text-base" style={{ color: '#5E758D', fontSize: '13px' }}>nebo nás kontaktujte přímo:</Text>
                  <div className="flex flex-col tablet:flex-row justify-center items-center space-y-2 tablet:space-y-0 tablet:space-x-4">
                    <Link href="tel:+420705500200" className="font-medium text-sm tablet:text-base" style={{ color: '#4bdadc', textDecoration: 'none', fontSize: '13px', cursor: "pointer" }}>
                      📞 +420 705 500 200
                    </Link>
                    <Text className="hidden tablet:block" style={{ color: '#5E758D', fontSize: '13px' }}>•</Text>
                    <Link href="mailto:asistentka.prochazka@ovbone.cz" className="font-medium text-sm tablet:text-base" style={{ color: '#4bdadc', textDecoration: 'none', fontSize: '13px', cursor: "pointer" }}>
                      ✉️ asistentka.prochazka@ovbone.cz
                    </Link>
                  </div>
                </div>
              </div>
            </Section>

            {/* Risk Reversal & Guarantee */}
            <Section className="border rounded-xl p-6 tablet:p-8 mb-8 tablet:mb-10 shadow-sm hover:shadow-lg transition-all duration-200" style={{ backgroundColor: 'rgba(145, 81, 224, 0.1)', borderColor: '#9151e0' }}>
              <Heading className="font-semibold mb-2 tablet:mb-3 text-lg tablet:text-xl" style={{ color: '#9151e0', fontSize: '21px', fontFamily: 'Switzer, sans-serif' }}>
                🛡️ Naše záruka spokojenosti
              </Heading>
              <Text className="m-0 mb-3 tablet:mb-4 text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>
                Nejste spokojeni s první konzultací? Můžete odejít kdykoliv chcete!
              </Text>
              <Text className="m-0 text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>
                • Bezplatná doživostní servis
              </Text>
              <Text className="m-0 text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>
                • Žádné skryté poplatky, žádné závazky
              </Text>
              <Text className="m-0 text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>
                • Transparentní a férový přístup ke každému klientovi
              </Text>
            </Section>

            {/* Scarcity Element */}
            <Section className="border rounded-xl p-6 tablet:p-8 mb-8 tablet:mb-10 shadow-sm hover:shadow-lg transition-all duration-200" style={{ backgroundColor: 'rgba(145, 81, 224, 0.1)', borderColor: '#9151e0' }}>
              <Heading className="font-semibold mb-2 tablet:mb-3 text-center text-lg tablet:text-xl" style={{ color: '#9151e0', fontSize: '21px', fontFamily: 'Switzer, sans-serif' }}>
                ⏰ Omezené kapacity
              </Heading>
              <Text className="m-0 text-center text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>
                Naše kalendáře se rychle plní. Klienti, kteří nás kontaktují do 24 hodin,
                mají 3x vyšší šanci na získání termínu v následujícím týdnu.
              </Text>
            </Section>
          </Container>

          {/* Enhanced Footer */}
           <Section className="text-white p-8 tablet:p-10" style={{ backgroundColor: '#050A10' }}>
            <div className="text-center space-y-4 tablet:space-y-6">
              <div className="flex justify-center space-x-6 mb-4 tablet:mb-6">
                <Link href="https://www.facebook.com/prochazka.group" className="hover:text-white text-sm tablet:text-base transition-colors duration-200" style={{ color: '#5E758D', textDecoration: 'none', cursor: "pointer" }}>Facebook</Link>
                <Link href="https://www.prochazkagroup.cz/" className="hover:text-white text-sm tablet:text-base transition-colors duration-200" style={{ color: '#5E758D', textDecoration: 'none', cursor: "pointer" }}>Web</Link>
                <Link href="https://www.instagram.com/prochazka.group/" className="hover:text-white text-sm tablet:text-base transition-colors duration-200" style={{ color: '#5E758D', textDecoration: 'none', cursor: "pointer" }}>Instagram</Link>
              </div>

              <Text className="mb-4 tablet:mb-6 text-sm tablet:text-base" style={{ color: '#5E758D', fontSize: '13px' }}>
                © {new Date().getFullYear()} ProcházkaGroup. Všechna práva vyhrazena.
              </Text>

              <div className="flex justify-center space-x-6 text-xs tablet:text-sm" style={{ color: '#5E758D', fontSize: '13px' }}>
                <Link href="https://www.prochazkagroup.cz/ochrana-soukromi" className="hover:text-white transition-colors duration-200" style={{ textDecoration: 'none', cursor: "pointer" }}>GDPR Ochrana soukromí</Link>
                {/* <Link href="#" className="hover:text-white transition-colors duration-200" style={{ textDecoration: 'none' }}>Obchodní podmínky</Link> */}
                {/* <Link href="#" className="hover:text-white transition-colors duration-200" style={{ textDecoration: 'none' }}>Odhlásit se</Link> */}
              </div>
            </div>
          </Section>
        </Body>
      </Html>
    </Tailwind>
  )
}

export const zajemUserEmail = (props) => {
  return <ZajemUserEmailComponent {...props} />
}

// Export subject for use in API
export const subject = ({ name }) => `Vaše poptávka přijata - BEZPLATNÁ konzultace čeká!`;

// Mock data for development
const mockZajemUser = {
  name: "Marie Nováková",
  email: "marie.novakova@email.cz",
  phone_number: "+420 777 123 456",
  consultant_name: "Jan Procházka",
  message: "Dobrý den, zajímám se o vaše služby finančního plánování. Mám několik otázek ohledně investičních možností a chtěla bych se domluvit na schůzce.",
  inquiryDate: "2025-01-15",
  segment: "new"
}

// @ts-ignore
export default () => <ZajemUserEmailComponent {...mockZajemUser} />