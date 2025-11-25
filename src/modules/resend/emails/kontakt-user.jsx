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

function KontaktUserEmailComponent({
  name,
  email,
  message,
  phone_number,
  consultant_name,
  urgency = "standard",
  personalizedGreeting,
  segment
}) {
  const formatDate = (date) => {
    if (!date) return new Date().toLocaleDateString('cs-CZ')
    return new Date(date).toLocaleDateString('cs-CZ')
  }

  const getUrgencyMessage = (urgency) => {
    const messages = {
      urgent: "⚡ Obdrželi jsme vaši urgentní zprávu a budeme vás kontaktovat do 24 hodin!",
      high: "🔥 Vaše zpráva má vysokou prioritu - kontaktujeme vás do 24 hodin!",
      standard: "📞 Kontaktujeme vás do 48 hodin během pracovních dnů."
    }
    return messages[urgency] || messages.standard
  }

  const getValueProposition = (segment) => {
    const propositions = {
      new: "Začněte svou cestu k finanční stabilitě s bezplatnou konzultací.",
      engaged: "Pokračujte v optimalizaci svých financí s našimi pokročilými službami.",
      highly_engaged: "Jako náš VIP klient máte přístup k prioritnímu servisu zdarma."
    }
    return propositions[segment] || propositions.new
  }

  return (
    <Tailwind>
      <Html className="font-sans" style={{ fontFamily: 'Satoshi, sans-serif' }}>
        <Head>
          <link rel="stylesheet" href="https://prochazka.group/css/satoshi.css" />
          <link rel="stylesheet" href="https://prochazka.group/css/switzer.css" />
        </Head>
        <Preview>Vaše zpráva byla přijata! - Procházka Group</Preview>
        <Body className="mx-auto w-full max-w-2xl tablet:max-w-3xl" style={{ backgroundColor: '#063F66' }}>
          {/* Enhanced Header with Trust Signals */}
          <Section className="text-white px-6 py-8 tablet:px-8 tablet:py-10 relative overflow-hidden" style={{ background: 'linear-gradient(to right, #9151e0, #4bdadc)' }}>
            <div className="absolute inset-0 opacity-90" style={{ background: 'linear-gradient(to right, #9151e0, #4bdadc)' }}></div>
            <div className="relative z-10">
              <Heading className="font-bold m-0 mb-2 text-3xl tablet:text-4xl" style={{ fontSize: '34px', fontFamily: 'Switzer, sans-serif' }}>
                Procházka Group
              </Heading>
              <Text className="m-0 text-sm tablet:text-base" style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>
                ✅ Spolehlivý finanční partner • 15+ let zkušeností
              </Text>
            </div>
          </Section>

          {/* Main Content */}
          <Container className="p-6 tablet:p-8" style={{ backgroundColor: '#050A10' }}>
            <Heading className="font-light text-center mb-1 text-4xl tablet:text-5xl" style={{ color: '#fff', fontFamily: 'Switzer, sans-serif' }}>
              {personalizedGreeting || `Dobrý den ${name}!`}
            </Heading>

            <Text className="text-center mb-8 text-lg tablet:text-xl" style={{ color: '#4bdadc'}}>
              {getValueProposition(segment)}
            </Text>

            {/* Success Confirmation with Urgency */}
            <Section className="border rounded-xl p-6 tablet:p-8 mb-8 tablet:mb-10 shadow-sm hover:shadow-lg transition-all duration-200" style={{ background: 'linear-gradient(to right, rgba(75, 218, 220, 0.1), rgba(145, 81, 224, 0.1))', borderColor: '#4bdadc' }}>
              <div className="text-center mb-6 tablet:mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 tablet:w-20 tablet:h-20 rounded-full mb-4" style={{ backgroundColor: 'rgba(75, 218, 220, 0.2)' }}>
                  <Text className="text-3xl tablet:text-4xl" style={{ color: '#4bdadc' }}>✅</Text>
                </div>
                <Heading className="font-light mb-4 pb-4 text-2xl tablet:text-3xl" style={{ color: '#4bdadc', fontSize: '34px', fontFamily: 'Switzer, sans-serif' }}>
                  Vaše zpráva byla úspěšně přijata!
                </Heading>
              </div>

              <Text className="mm-0 text-center leading-relaxed text-lg font-light tablet:text-xl leading-tight" style={{ color: '#fff', }}>
                Děkujeme za váš zájem o naše služby. Vaše zpráva byla doručena našemu specialistovi.
              </Text>

              <Section className="rounded-lg p-4 tablet:p-6" style={{ backgroundColor: '#063F66', borderLeft: '4px solid #4bdadc' }}>
                <Text className="m-0 font-regular text-center text-md tablet:text-base" style={{ color: '#4bdadc' }}>
                  {getUrgencyMessage(urgency)}
                </Text>
              </Section>
            </Section>

            {/* Multiple Contact Options - HIGH CONVERSION FOCUS */}
            <Section className="text-white rounded-xl p-6 tablet:p-8 mb-8 tablet:mb-10" style={{ backgroundColor: '#050A10' }}>
              <Heading className="font-light text-center mb-6 tablet:mb-8 text-xl tablet:text-2xl" style={{ color: '#fff', fontFamily: 'Switzer, sans-serif' }}>
                🚀 Chcete rychlejší odpověď? Kontaktujte nás ihned:
              </Heading>

              <div className="space-y-4">
                {/* WhatsApp - HIGHEST CONVERSION */}
                {/* <Row className="mb-4 tablet:mb-6">
                  <Column className="w-full">
                    <Link
                      href="https://wa.me/420123456789?text=Ahoj, právě jsem odeslal kontaktní formulář a rád bych mluvil s vaším specialistou."
                      className="px-6 py-4 tablet:px-8 tablet:py-5 rounded-lg font-bold inline-block transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 w-full text-center text-sm tablet:text-base"
                      style={{ backgroundColor: '#4bdadc', color: '#050A10', fontSize: '13px', textDecoration: 'none' }}
                    >
                      💬 WhatsApp
                    </Link>
                  </Column>
                </Row> */}

                {/* Phone Call - SECOND HIGHEST CONVERSION */}
                <Row className="mb-4 tablet:mb-6 w-fit">
                  <Column className="w-full tablet:w-1/2 mb-4 tablet:mb-0 tablet:pr-2 flex justify-center items-center">
                    <Link
                      href="tel:+420 705 500 200"
                      className="px-4 py-4 tablet:px-6 tablet:py-5 rounded-lg font-bold inline-block transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 w-full text-center text-sm tablet:text-base max-w-[200px] min-w-[150px]"
                      style={{ backgroundColor: '#9151e0', color: '#fff', fontSize: '13px', textDecoration: 'none', cursor: "pointer" }}
                    >
                      📞 Zavolat teď
                    </Link>
                  </Column>
                  {/* <Column className="w-full tablet:w-1/2 tablet:pl-2">
                    <Link
                      href="sms:+420123456789?body=Ahoj, právě jsem odeslal kontaktní formulář."
                      className="px-4 py-4 tablet:px-6 tablet:py-5 rounded-lg font-bold inline-block transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 w-full text-center text-sm tablet:text-base"
                      style={{ backgroundColor: '#5E758D', color: '#fff', fontSize: '13px', textDecoration: 'none' }}
                    >
                      💬 SMS
                    </Link>
                  </Column> */}
                </Row>
              </div>

              <Text className="text-center mt-4 tablet:mt-6 text-sm tablet:text-base" style={{ color: '#5E758D', fontSize: '13px' }}>
                💡 Tip: Zavolat nám na telefon má nejrychlejší odezvu - často do 30 minut pokud to nezvedneme!
              </Text>
            </Section>

            {/* Message Summary */}
            <Section className="rounded-lg p-6 tablet:p-8 mb-8 tablet:mb-10 shadow-sm hover:shadow-lg transition-all duration-200" style={{ backgroundColor: 'rgba(117, 171, 192, 0.1)' }}>
              <Heading className="font-semibold mb-4 tablet:mb-6 text-lg tablet:text-xl" style={{ color: '#fff', fontSize: '21px', fontFamily: 'Switzer, sans-serif' }}>
                📝 Shrnutí vaší zprávy
              </Heading>

              {consultant_name && (
                <Row className="mb-3 tablet:mb-4">
                  <Column className="w-full tablet:w-1/3 mb-2 tablet:mb-0">
                    <Text className="font-semibold m-0 text-sm tablet:text-base" style={{ color: '#4bdadc', fontSize: '13px' }}>Konzultant:</Text>
                  </Column>
                  <Column className="w-full tablet:w-2/3">
                    <Text className="m-0 text-sm tablet:text-base whitespace-nowrap" style={{ color: '#fff', fontSize: '13px' }}>{consultant_name}</Text>
                  </Column>
                </Row>
              )}

              <Row className="mb-3 tablet:mb-4">
                <Column className="w-2/5 tablet:w-1/3 mb-2 tablet:mb-0">
                  <Text className="font-semibold m-0 text-sm tablet:text-base" style={{ color: '#4bdadc', fontSize: '13px' }}>Vaše zpráva:</Text>
                </Column>
                <Column className="w-full tablet:w-2/3">
                  <Text className="m-0 whitespace-pre-wrap text-sm tablet:text-base text-right" style={{ color: '#fff', fontSize: '13px' }}>{message}</Text>
                </Column>
              </Row>
            </Section>

            {/* Social Proof & Trust Signals */}
            <Section className="border rounded-xl p-6 tablet:p-8 mb-8 tablet:mb-10 shadow-sm hover:shadow-lg transition-all duration-200" style={{ backgroundColor: 'rgba(75, 218, 220, 0.1)', borderColor: '#4bdadc' }}>
              <Heading className="font-light mb-4 tablet:mb-6 text-lg tablet:text-xl" style={{ color: '#4bdadc', fontSize: '21px', fontFamily: 'Switzer, sans-serif' }}>
                ⭐ Proč si nás klienti vybírají?
              </Heading>

              <div className="space-y-2 tablet:space-y-4">
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

            {/* Strategic CTA Placement */}
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

            {/* Scarcity/Urgency Element */}
            <Section className="border rounded-xl p-6 tablet:p-8 mb-8 tablet:mb-10 shadow-sm hover:shadow-lg transition-all duration-200" style={{ backgroundColor: 'rgba(145, 81, 224, 0.1)', borderColor: '#9151e0' }}>
              <Heading className="font-semibold mb-2 tablet:mb-3 text-lg tablet:text-xl" style={{ color: '#9151e0', fontSize: '21px', fontFamily: 'Switzer, sans-serif' }}>
                ⏰ Omezená kapacita termínů
              </Heading>
              <Text className="m-0 text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>
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

export const kontaktUserEmail = (props) => {
  return <KontaktUserEmailComponent {...props} />
}

// Export subject for use in API
export const subject = ({ name }) => `Vaše zpráva byla přijata - BEZPLATNÁ konzultace čeká!`;

// Mock data for development
const mockKontaktUser = {
  name: "Marie Nováková",
  email: "marie.novakova@email.cz",
  phone_number: "+420 777 123 456",
  message: "Dobrý den, zajímám se o vaše finanční služby. Chtěla bych se domluvit na bezplatné konzultaci.",
  consultant_name: "Jan Procházka",
  urgency: "high",
  segment: "new"
}

// @ts-ignore
export default () => <KontaktUserEmailComponent {...mockKontaktUser} />