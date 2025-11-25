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

function BenefitUserEmailComponent({
  name,
  email,
  message,
  phone_number,
  consultant_name,
  benefitType = "Benefit Program",
  applicationDate,
  status = "přijata",
  personalizedGreeting,
  segment,
  timeContext
}) {
  const formatDate = (date) => {
    if (!date) return new Date().toLocaleDateString('cs-CZ')
    return new Date(date).toLocaleDateString('cs-CZ')
  }

  // Enhanced status messages based on segment
  const getStatusMessage = (status, segment) => {
    const messages = {
      přijata: {
        new: "Vaše žádost byla úspěšně přijata a je nyní v procesu schvalování.",
        engaged: "Vaše žádost byla přijata! Těšíme se na další spolupráci.",
        highly_engaged: "Vítejte zpět! Vaše žádost byla přijata a bude prioritně zpracována."
      }
    }
    return messages[status]?.[segment] || messages[status]?.new || status
  }

  // Segment-specific value propositions
  const getValueProposition = (segment) => {
    const propositions = {
      new: "Začněte svou cestu k finanční stabilitě s našimi odbornými službami.",
      engaged: "Pokračujte v rozvoji svého finančního portfolia s našimi pokročilými službami.",
      highly_engaged: "Jako náš nejaktivnější klient máte přístup k exkluzivním službám a prioritní podpoře."
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
        <Preview>Vaše žádost o benefit byla úspěšně přijata! - Procházka Group</Preview>
        <Body className="mx-auto w-full max-w-2xl tablet:max-w-4xl" style={{ backgroundColor: '#063F66' }}>
          {/* Enhanced Header with Trust Signals */}
          <Section className="text-white px-6 py-8 tablet:px-12 tablet:py-10 relative overflow-hidden" style={{ backgroundColor: '#9151e0' }}>
            <div className="absolute inset-0 opacity-90" style={{ background: 'linear-gradient(to right, #9151e0, #4bdadc)' }}></div>
            <div className="relative z-10">
              <Heading className="font-bold m-0 mb-2 text-3xl tablet:text-4xl" style={{ fontFamily: 'Switzer, sans-serif' }}>
                ProcházkaGroup
              </Heading>
              <Text className="m-0 text-md tablet:text-base" style={{ color: 'rgba(255,255,255,0.8)' }}>
                ✅ Spolehlivý finanční partner od roku 2010
              </Text>
            </div>
          </Section>

          {/* Personalized Main Content */}
          <Container className="p-6 tablet:p-8" style={{ backgroundColor: '#050A10' }}>
            <Heading className="font-light text-center mb-1 text-4xl tablet:text-5xl" style={{ color: '#fff', fontFamily: 'Switzer, sans-serif' }}>
              {personalizedGreeting || `Dobrý den, ${name},`}
            </Heading>

            <Text className="text-center mb-8 text-lg font-light tablet:text-xl max-w-xl" style={{ color: '#4bdadc', fontFamily: "Satoshi-Light, sans-serif" }}>
              {getValueProposition(segment)}
            </Text>

            <Section className="border rounded-xl p-8 tablet:p-10 shadow-sm hover:shadow-lg transition-all duration-200" style={{ background: 'linear-gradient(to right, rgba(75, 218, 220, 0.1), rgba(145, 81, 224, 0.1))', borderColor: '#4bdadc' }}>
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 tablet:w-20 tablet:h-20 rounded-full mb-2" style={{ backgroundColor: 'rgba(75, 218, 220, 0.2)' }}>
                  <Text className="text-2xl tablet:text-3xl" style={{ color: '#4bdadc' }}>✅</Text>
                </div>
                <Heading className="font-light mb-4 pb-4 text-2xl tablet:text-3xl" style={{ color: '#4bdadc', fontFamily: 'Switzer, sans-serif' }}>
                  Žádost úspěšně přijata!
                </Heading>
              </div>
              <Text className="m-0 text-center leading-relaxed text-lg font-light tablet:text-xl leading-tight" style={{ color: '#fff' }}>
                {getStatusMessage(status, segment)}
              </Text>
            </Section>

            {/* Enhanced Application Details */}
            <Section className="border rounded-xl p-6 tablet:p-8 shadow-sm hover:shadow-lg transition-all duration-200" style={{ backgroundColor: '#063F66', borderColor: '#5E758D' }}>
              <Heading className="font-regular mb-6 flex items-center text-lg tablet:text-xl" style={{ color: '#fff', fontFamily: 'Switzer, sans-serif' }}>
                📋 Detaily vaší žádosti
              </Heading>

              <div className="space-y-4">
                <Row className="pb-3" style={{ borderBottom: '1px solid #5E758D' }}>
                  <Column className="w-full tablet:w-1/3 mb-2 tablet:mb-0">
                    <Text className="font-semibold m-0 text-sm tablet:text-base whitespace-nowrap" style={{ color: '#4bdadc', }}>Typ benefitu:</Text>
                  </Column>
                  <Column className="w-full tablet:w-2/3">
                    <Text className="m-0 text-sm tablet:text-base whitespace-nowrap" style={{ color: '#fff' }}>{consultant_name || benefitType}</Text>
                  </Column>
                </Row>

                <Row className="pb-3" style={{ borderBottom: '1px solid #5E758D' }}>
                  <Column className="w-full tablet:w-1/3 mb-2 tablet:mb-0">
                    <Text className="font-semibold m-0 text-sm tablet:text-base whitespace-nowrap" style={{ color: '#4bdadc',}}>Datum žádosti:</Text>
                  </Column>
                  <Column className="w-full tablet:w-2/3">
                    <Text className="m-0 text-sm tablet:text-base whitespace-nowrap" style={{ color: '#fff', }}>{formatDate(applicationDate || new Date())}</Text>
                  </Column>
                </Row>

                <Row className="pb-3" style={{ borderBottom: '1px solid #5E758D' }}>
                  <Column className="w-full tablet:w-1/3 mb-2 tablet:mb-0">
                    <Text className="font-semibold m-0 text-sm tablet:text-base" style={{ color: '#4bdadc', fontSize: '13px' }}>Status:</Text>
                  </Column>
                  <Column className="w-full tablet:w-2/3">
                    <span className="inline-flex items-center px-3 py-1 tablet:px-4 tablet:py-2 rounded-full text-sm font-medium" style={{ backgroundColor: 'rgba(75, 218, 220, 0.2)', color: '#4bdadc' }}>
                      {status}
                    </span>
                  </Column>
                </Row>
              </div>
            </Section>

            {/* Next Steps with Progress */}
            <Section className="border rounded-xl p-6 tablet:p-8 shadow-sm hover:shadow-lg transition-all duration-200" style={{ backgroundColor: 'rgba(75, 218, 220, 0.1)', borderColor: '#4bdadc' }}>
              <Heading className="font-light mb-4 tablet:mb-6" style={{ color: '#4bdadc', fontFamily: 'Switzer, sans-serif' }}>
                🚀 Co bude následovat?
              </Heading>

              <div className="space-y-3 tablet:space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 tablet:w-8 tablet:h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: '#4bdadc', fontSize: '13px' }}>1</div>
                  <Text className="m-0" style={{ color: '#fff', fontSize: '13px' }}>Vaše žádost bude zkontrolována naším týmem (1-2 pracovní dny)</Text>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 tablet:w-8 tablet:h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: '#5E758D', fontSize: '13px' }}>2</div>
                  <Text className="m-0" style={{ color: '#fff', fontSize: '13px' }}>Vámi vybraný poradce vás kontaktuje a domluví si s vámi další kroky</Text>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 tablet:w-8 tablet:h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: '#5E758D', fontSize: '13px' }}>3</div>
                  <Text className="m-0" style={{ color: '#fff', fontSize: '13px' }}>Připravíme pro Vás personalizovanou nabídku služeb a zaregistrujeme Vás do Benefit Programu.</Text>
                </div>
              </div>
            </Section>

            {/* Enhanced CTA Section */}
            <Section className="text-center mb-8 mt-8 tablet:mb-10">
              <div className="space-y-2 tablet:space-y-6">
                <Link
                  href="https://www.prochazkagroup.cz/o-nas#poradci"
                  className="px-8 py-4 tablet:px-10 tablet:py-5 rounded-lg font-semibold inline-block transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  style={{ backgroundColor: '#9151e0', color: '#fff', fontSize: '13px', textDecoration: 'none', cursor: "pointer" }}
                >
                  Zavolejte nám
                </Link>

                <div className="text-center">
                  <Text className="mb-2 tablet:mb-3" style={{ color: '#5E758D', fontSize: '13px' }}>nebo</Text>
                  <p
                    className="font-medium"
                    style={{ color: '#4bdadc', textDecoration: 'none', fontSize: '13px' }}
                  >
                    Kontaktujeme Vás my
                  </p>
                </div>
              </div>
            </Section>

            {/* Educational Content */}
            <Section className="rounded-xl p-6 tablet:p-8 shadow-sm hover:shadow-lg transition-all duration-200" style={{ backgroundColor: 'rgba(117, 171, 192, 0.1)' }}>
              <Heading className="font-semibold mb-4 tablet:mb-6" style={{ color: '#fff', fontSize: '21px', fontFamily: 'Switzer, sans-serif' }}>
                💡 Tip pro vás
              </Heading>
              <Text className="m-0 leading-relaxed" style={{ color: '#fff', fontSize: '13px' }}>
                Věděli jste, že správně nastavený finanční plán může ušetřit až 15% na vašich finančních výdajích?
                Naši specialisté vám rádi poradí, jak optimalizovat váš rozpočet pro maximální úsporu a efektivní využití vašich prostředků.
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

export const benefitUserEmail = (props) => {
  return <BenefitUserEmailComponent {...props} />
}

// Export subject for use in API
export const subject = ({ name }) => `Vaše žádost o benefit byla přijata - ${name}`;

// Mock data for development
const mockBenefitUser = {
  name: "Jan Novák",
  email: "jan.novak@email.cz",
  phone_number: "+420 602 123 456",
  consultant_name: "Benefit Program",
  benefitType: "Sleva na služby",
  applicationDate: "2025-01-15",
  status: "přijata"
}

// @ts-ignore
export default () => <BenefitUserEmailComponent {...mockBenefitUser} />
