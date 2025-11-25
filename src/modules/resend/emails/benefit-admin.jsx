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

function BenefitAdminEmailComponent({ name, email, message, phone_number, consultant_name, benefitType = "Benefit Program", applicationDate }) {
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
        <Preview>Nová žádost o benefit - {name}</Preview>
        <Body className="mx-auto w-full max-w-2xl tablet:max-w-4xl" style={{ backgroundColor: '#063F66' }}>
          {/* Header */}
          <Section className="text-white px-6 py-4 tablet:px-12 tablet:py-8" style={{  background: 'linear-gradient(to right, #9151e0, #4bdadc)'  }}>
            <Heading className="font-bold m-0 text-3xl tablet:text-4xl" style={{ fontSize: '21px', fontFamily: 'Switzer, sans-serif', lineHeight: '1.2' }}>
              Procházka Group - Nová žádost o benefit
            </Heading>
          </Section>

          {/* Main Content */}
          <Container className="p-6 tablet:p-8" style={{ backgroundColor: '#050A10' }}>
            <Heading className="font-light text-center mb-6 text-2xl tablet:text-4xl" style={{ color: '#fff', fontSize: '34px', fontFamily: 'Switzer, sans-serif' }}>
              Nová žádost o benefit od: <br/>
              <span className="text-[#4bdadc]">{name}</span>
            </Heading>

            <Section className="border rounded-lg p-6 mb-6 tablet:p-8 tablet:mb-8 shadow-sm hover:shadow-lg transition-all duration-200" style={{ backgroundColor: 'rgba(145, 81, 224, 0.1)', borderColor: '#9151e0' }}>
              <Heading className="font-light mb-2 text-lg tablet:text-xl" style={{ color: '#9151e0', fontSize: '21px', fontFamily: 'Switzer, sans-serif' }}>
                📋 Nová žádost čeká na zpracování
              </Heading>
              <Text className="m-0 text-md tablet:text-base leading-relaxed" style={{ color: '#fff', }}>
                Byla přijata nová žádost o benefit program. Zkontrolujte detaily a kontaktujte žadatele.
              </Text>
            </Section>

            {/* Application Details */}
            <Section className="rounded-lg p-6 mb-6 tablet:p-8 tablet:mb-8 shadow-sm hover:shadow-lg transition-all duration-200" style={{ backgroundColor: 'rgba(117, 171, 192, 0.1)' }}>
              <Heading className="font-semibold mb-4 text-lg tablet:text-xl" style={{ color: '#fff', fontSize: '21px', fontFamily: 'Switzer, sans-serif' }}>
                Detaily žádosti
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
                  <Text className="m-0 text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>{email}</Text>
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
              <Row className="mb-3">
                <Column className="w-full tablet:w-1/3 mb-2 tablet:mb-0">
                  <Text className="font-semibold m-0 text-sm tablet:text-base" style={{ color: '#4bdadc', fontSize: '13px' }}>Jméno Poradce:</Text>
                </Column>
                <Column className="w-full tablet:w-2/3">
                  <Text className="m-0 text-sm tablet:text-base whitespace-nowrap" style={{ color: '#fff', fontSize: '13px' }}>{consultant_name || benefitType}</Text>
                </Column>
              </Row>
              <Row className="mb-3">
                <Column className="w-full tablet:w-1/3 mb-2 tablet:mb-0">
                  <Text className="font-semibold m-0 text-sm tablet:text-base" style={{ color: '#4bdadc', fontSize: '13px' }}>Datum žádosti:</Text>
                </Column>
                <Column className="w-full tablet:w-2/3">
                  <Text className="m-0 text-sm tablet:text-base whitespace-nowrap" style={{ color: '#fff', fontSize: '13px' }}>{formatDate(applicationDate || new Date())}</Text>
                </Column>
              </Row>
              {message && (
                <Row>
                  <Column className="w-2/5 tablet:w-1/3 mb-2 tablet:mb-0">
                    <Text className="font-semibold m-0 text-sm tablet:text-base" style={{ color: '#4bdadc', fontSize: '13px' }}>Zpráva:</Text>
                  </Column>
                  <Column className="w-full tablet:w-2/3">
                    <Text className="m-0 text-sm tablet:text-base text-right " style={{ color: '#fff', fontSize: '13px' }}>{message}</Text>
                  </Column>
                </Row>
              )}
            </Section>

            {/* Action Buttons */}
            <Section className="text-center mb-6 tablet:mb-8">
              <Row>
                <Column className="w-full tablet:w-1/2 mb-4 tablet:mb-0 tablet:pr-2">
                  <Link
                    href={`mailto:${email}?subject=Odpověď na žádost o benefit`}
                    className="px-4 max-w-[200px] py-3 tablet:px-6 tablet:py-4 rounded-lg font-semibold inline-block transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 text-sm tablet:text-base min-w-[150px] tablet:min-w-0"
                    style={{ backgroundColor: '#9151e0', color: '#fff', fontSize: '13px', textDecoration: 'none', cursor: "pointer" }}
                  >
                    Odpovědět emailem
                  </Link>
                </Column>
              </Row>
            </Section>

            {/* Priority Notice */}
            <Section className="border rounded-lg p-6 mb-6 tablet:p-8 tablet:mb-8 shadow-sm hover:shadow-lg transition-all duration-200" style={{ backgroundColor: 'rgba(75, 218, 220, 0.1)', borderColor: '#4bdadc' }}>
              <Heading className="font-semibold mb-2 text-lg tablet:text-xl" style={{ color: '#4bdadc', fontSize: '21px', fontFamily: 'Switzer, sans-serif' }}>
                ⚡ Doporučení
              </Heading>
              <Text className="m-0 text-sm tablet:text-base leading-relaxed" style={{ color: '#fff', fontSize: '13px' }}>
                Kontaktujte žadatele během 24 hodin pro nejlepší zkušenost. Nové žádosti mají nejvyšší prioritu.
              </Text>
            </Section>
          </Container>

          {/* Footer */}
          <Section className="p-6 tablet:p-8" style={{ backgroundColor: 'rgba(117, 171, 192, 0.1)' }}>
            <Text className="text-center mb-4 text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>
              Tento email byl automaticky odeslán z emailového systému ProcházkaGroup.
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

export const benefitAdminEmail = (props) => {
  return <BenefitAdminEmailComponent {...props} />
}

// Export subject for use in API
export const subject = ({ name }) => `Nová žádost o benefit - ${name}`;

// Mock data for development
const mockBenefitAdmin = {
  name: "Marie Svobodová",
  email: "marie.svobodova@email.cz",
  phone_number: "+420 777 123 456",
  consultant_name: "Ondřej Efenberk",
  benefitType: "Konzultace zdarma",
  applicationDate: "2025-01-15",
  message: "Zajímám se o konzultaci ohledně finančního plánování pro naši rodinu."
}

// @ts-ignore
export default () => <BenefitAdminEmailComponent {...mockBenefitAdmin} />
