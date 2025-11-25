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

function KontaktAdminEmailComponent({ name, email, message, phone_number, consultant_name }) {
  const formatDate = (date) => {
    if (!date) return new Date().toLocaleDateString('cs-CZ')
    return new Date(date).toLocaleDateString('cs-CZ')
  }

  return (
    <Tailwind>
      <Html className="font-sans" style={{ fontFamily: 'Satoshi, sans-serif' }}>
        <Head>
          <link rel="stylesheet" href="https://prochazka.group/css/satoshi.css" />
          <link rel="stylesheet" href="https://prochazka.group/css/switzer.css" />
        </Head>
        <Preview>Nová kontaktní zpráva - {name}</Preview>
        <Body className="mx-auto w-full max-w-2xl tablet:max-w-4xl" style={{ backgroundColor: '#063F66' }}>
          {/* Header */}
          <Section className="text-white px-6 py-4 tablet:px-12 tablet:py-8" style={{ backgroundColor: '#9151e0' }}>
            <Heading className="font-bold m-0 text-2xl tablet:text-4xl" style={{ fontFamily: 'Switzer, sans-serif' }}>
              Procházka Group - Nová kontaktní zpráva
            </Heading>
          </Section>

          {/* Main Content */}
          <Container className="p-6 tablet:p-8" style={{ backgroundColor: '#050A10' }}>
            <Heading className="font-light text-center mb-6 text-2xl tablet:text-4xl" style={{ color: '#fff', fontSize: '34px', fontFamily: 'Switzer, sans-serif' }}>
              Nová zpráva od: <br/>
              <span className="text-[#4bdadc]">{name}</span>
            </Heading>

            <Section className="border rounded-lg p-6 mb-6 tablet:p-8 tablet:mb-8 shadow-sm hover:shadow-lg transition-all duration-200" style={{ backgroundColor: 'rgba(75, 218, 220, 0.1)', borderColor: '#4bdadc' }}>
              <Heading className="font-semibold mb-2 text-lg tablet:text-xl" style={{ color: '#4bdadc', fontSize: '21px', fontFamily: 'Switzer, sans-serif' }}>
                💬 Nová kontaktní zpráva
              </Heading>
              <Text className="m-0 text-md tablet:text-base leading-relaxed" style={{ color: '#fff', }}>
                Zákazník {name} vás kontaktoval přes kontaktní formulář. Zkontrolujte detaily a odpovězte co nejdříve.
              </Text>
            </Section>

            {/* Contact Details */}
            <Section className="rounded-lg p-6 mb-6 tablet:p-8 tablet:mb-8 shadow-sm hover:shadow-lg transition-all duration-200" style={{ backgroundColor: 'rgba(117, 171, 192, 0.1)' }}>
              <Heading className="font-semibold mb-4 text-lg tablet:text-xl" style={{ color: '#fff', fontSize: '21px', fontFamily: 'Switzer, sans-serif' }}>
                Kontaktní údaje
              </Heading>
              <Row className="mb-3">
                <Column className="w-full tablet:w-1/3 mb-2 tablet:mb-0">
                  <Text className="font-semibold m-0 text-sm tablet:text-base" style={{ color: '#4bdadc', fontSize: '13px' }}>Jméno:</Text>
                </Column>
                <Column className="w-full tablet:w-2/3">
                  <Text className="m-0 text-sm tablet:text-base whitespace-nowrap" style={{ color: '#fff', fontSize: '13px' }}>{name}</Text>
                </Column>
              </Row>
              <Row className="mb-3">
                <Column className="w-full tablet:w-1/3 mb-2 tablet:mb-0">
                  <Text className="font-semibold m-0 text-sm tablet:text-base" style={{ color: '#4bdadc', fontSize: '13px' }}>Email:</Text>
                </Column>
                <Column className="w-full tablet:w-2/3">
                  <Text className="m-0 text-sm tablet:text-base whitespace-nowrap" style={{ color: '#fff', fontSize: '13px' }}>{email}</Text>
                </Column>
              </Row>
              {phone_number && (
                <Row className="mb-3">
                  <Column className="w-full tablet:w-1/3 mb-2 tablet:mb-0">
                    <Text className="font-semibold m-0 text-sm tablet:text-base" style={{ color: '#4bdadc', fontSize: '13px' }}>Telefon:</Text>
                  </Column>
                  <Column className="w-full tablet:w-2/3">
                    <Text className="m-0 text-sm tablet:text-base whitespace-nowrap" style={{ color: '#fff', fontSize: '13px' }}>{phone_number}</Text>
                  </Column>
                </Row>
              )}
              {consultant_name && (
                <Row className="mb-3">
                  <Column className="w-full tablet:w-1/3 mb-2 tablet:mb-0">
                    <Text className="font-semibold m-0 text-sm tablet:text-base" style={{ color: '#4bdadc', fontSize: '13px' }}>Poradce:</Text>
                  </Column>
                  <Column className="w-full tablet:w-2/3">
                    <Text className="m-0 text-sm tablet:text-base whitespace-nowrap" style={{ color: '#fff', fontSize: '13px' }}>{consultant_name}</Text>
                  </Column>
                </Row>
              )}
              <Row>
                <Column className="w-full tablet:w-1/3 mb-2 tablet:mb-0">
                  <Text className="font-semibold m-0 text-sm tablet:text-base" style={{ color: '#4bdadc', fontSize: '13px' }}>Datum:</Text>
                </Column>
                <Column className="w-full tablet:w-2/3">
                  <Text className="m-0 text-sm tablet:text-base whitespace-nowrap" style={{ color: '#fff', fontSize: '13px' }}>{formatDate()}</Text>
                </Column>
              </Row>
            </Section>

            {/* Message */}
            {message && (
              <Section className="border rounded-lg p-6 mb-6 tablet:p-8 tablet:mb-8 shadow-sm hover:shadow-lg transition-all duration-200" style={{ backgroundColor: '#063F66', borderColor: '#5E758D' }}>
                <Heading className="font-semibold mb-4 text-lg tablet:text-xl" style={{ color: '#fff', fontSize: '21px', fontFamily: 'Switzer, sans-serif' }}>
                  Zpráva
                </Heading>
                <Text className="m-0 whitespace-pre-wrap text-sm tablet:text-base leading-relaxed" style={{ color: '#fff', fontSize: '13px' }}>
                  {message}
                </Text>
              </Section>
            )}

            {/* Action Buttons */}
            <Section className="text-center mb-6 tablet:mb-8">
              <Row className="mb-2">
                <Column className="w-full tablet:w-1/2 mb-4 tablet:mb-0 tablet:pr-2">
                  <Link
                    href={`mailto:${email}?subject=Nová kontaktní zpráva - ${name}`}
                    className="px-4 py-3 tablet:px-6 tablet:py-4 rounded-lg font-semibold inline-block transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 text-sm tablet:text-base min-w-[150px] max-w-[200px]"
                    style={{ backgroundColor: '#9151e0', color: '#fff', fontSize: '13px', textDecoration: 'none', cursor: "pointer" }}
                  >
                    Odpovědět emailem
                  </Link>
                </Column>
              </Row>
              <Row>
                <Column className="w-full tablet:w-1/2 tablet:pl-2">
                  {phone_number && (
                    <Link
                      href={`tel:${phone_number}`}
                      className="px-4 py-3 tablet:px-6 tablet:py-4 rounded-lg font-semibold inline-block transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 text-sm tablet:text-base min-w-[150px] max-w-[200px]"
                      style={{ backgroundColor: '#4bdadc', color: '#050A10', fontSize: '13px', textDecoration: 'none', cursor: "pointer" }}
                    >
                      Zavolat
                    </Link>
                  )}
                </Column>
              </Row>
            </Section>

            {/* Response Time Notice */}
            <Section className="border rounded-lg p-6 mb-6 tablet:p-8 tablet:mb-8 shadow-sm hover:shadow-lg transition-all duration-200" style={{ backgroundColor: 'rgba(145, 81, 224, 0.1)', borderColor: '#9151e0' }}>
              <Heading className="font-semibold mb-2 text-lg tablet:text-xl" style={{ color: '#9151e0', fontSize: '21px', fontFamily: 'Switzer, sans-serif' }}>
                ⏰ Doporučená doba odpovědi
              </Heading>
              <Text className="m-0 text-sm tablet:text-base leading-relaxed" style={{ color: '#fff', fontSize: '13px' }}>
                Ideální doba pro odpověď je do 24 hodin. Zákazníci oceňují rychlou komunikaci.
              </Text>
            </Section>
          </Container>

          {/* Footer */}
          <Section className="p-6 tablet:p-8" style={{ backgroundColor: 'rgba(117, 171, 192, 0.1)' }}>
            <Text className="text-center mb-4 text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>
              Tento email byl odeslán z kontaktního formuláře na webu Procházka Group.
            </Text>
            <Text className="text-center text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>
              © {new Date().getFullYear()} Procházka Group. Všechna práva vyhrazena.
            </Text>
          </Section>
        </Body>
      </Html>
    </Tailwind>
  )
}

export const kontaktAdminEmail = (props) => {
  return <KontaktAdminEmailComponent {...props} />
}

// Export subject for use in API
export const subject = ({ name }) => `Nová kontaktní zpráva - ${name}`;

// Mock data for development
const mockKontaktAdmin = {
  name: "Petr Dvořák",
  email: "petr.dvorak@email.cz",
  phone_number: "+420 602 123 456",
  consultant_name: "Ondřej Efenberk",
  message: "Dobrý den,\n\nrád bych se informoval o vašich finančních službách. Máte volný termín na konzultaci?\n\nDěkuji,\nPetr Dvořák"
}

// @ts-ignore
export default () => <KontaktAdminEmailComponent {...mockKontaktAdmin} />
