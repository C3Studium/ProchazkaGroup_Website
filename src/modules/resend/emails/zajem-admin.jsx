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

function ZajemAdminEmailComponent({ name, email, phone_number, consultant_name, message, inquiryDate }) {
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
        <Preview>Nový zájem o služby - {name}</Preview>
        <Body className="mx-auto w-full max-w-2xl tablet:max-w-3xl" style={{ backgroundColor: '#063F66' }}>
          {/* Header */}
          <Section className="text-white px-6 py-4 tablet:px-8 tablet:py-5" style={{ backgroundColor: '#9151e0' }}>
            <Heading className="font-bold m-0 text-xl tablet:text-2xl" style={{ fontFamily: 'Switzer, sans-serif' }}>
              Procházka Group - Nový zájem o služby
            </Heading>
          </Section>

          {/* Main Content */}
          <Container className="p-6 tablet:p-8" style={{ backgroundColor: '#050A10' }}>
            <Heading className="font-light text-center mb-6 text-2xl tablet:text-4xl" style={{ color: '#fff', fontSize: '34px', fontFamily: 'Switzer, sans-serif' }}>
              Nový zájemce: <br/>
              <span className="text-[#4bdadc]">{name}</span>
            </Heading>

            <Section className="border rounded-lg p-6 tablet:p-8 mb-6 tablet:mb-8 shadow-sm hover:shadow-lg transition-all duration-200" style={{ backgroundColor: 'rgba(145, 81, 224, 0.1)', borderColor: '#9151e0' }}>
              <Heading className="font-semibold mb-2 tablet:mb-3 text-lg tablet:text-xl" style={{ color: '#9151e0', fontSize: '21px', fontFamily: 'Switzer, sans-serif' }}>
                🚀 Nový potenciální klient
              </Heading>
              <Text className="m-0 text-md tablet:text-base" style={{ color: '#fff' }}>
                Klient {name} projevil zájem o naše služby. Kontaktujte ho co nejdříve pro zachování zájmu.
              </Text>
            </Section>

            {/* Contact Details */}
            <Section className="rounded-lg p-6 tablet:p-8 mb-6 tablet:mb-8 shadow-sm hover:shadow-lg transition-all duration-200" style={{ backgroundColor: 'rgba(117, 171, 192, 0.1)' }}>
              <Heading className="font-semibold mb-4 tablet:mb-6 text-lg tablet:text-xl" style={{ color: '#fff', fontSize: '21px', fontFamily: 'Switzer, sans-serif' }}>
                Kontaktní údaje
              </Heading>
              <Row className="mb-3 tablet:mb-4">
                <Column className="w-full tablet:w-1/3 mb-2 tablet:mb-0">
                  <Text className="font-semibold m-0 text-sm tablet:text-base" style={{ color: '#4bdadc', fontSize: '13px' }}>Jméno:</Text>
                </Column>
                <Column className="w-full tablet:w-2/3">
                  <Text className="m-0 text-sm tablet:text-base whitespace-nowrap" style={{ color: '#fff', fontSize: '13px' }}>{name}</Text>
                </Column>
              </Row>
              <Row className="mb-3 tablet:mb-4">
                <Column className="w-full tablet:w-1/3 mb-2 tablet:mb-0">
                  <Text className="font-semibold m-0 text-sm tablet:text-base" style={{ color: '#4bdadc', fontSize: '13px' }}>Email:</Text>
                </Column>
                <Column className="w-full tablet:w-2/3">
                  <Text className="m-0 text-sm tablet:text-base whitespace-nowrap" style={{ color: '#fff', fontSize: '13px' }}>{email}</Text>
                </Column>
              </Row>
              <Row className="mb-3 tablet:mb-4">
                <Column className="w-full tablet:w-1/3 mb-2 tablet:mb-0">
                  <Text className="font-semibold m-0 text-sm tablet:text-base" style={{ color: '#4bdadc', fontSize: '13px' }}>Telefon:</Text>
                </Column>
                <Column className="w-full tablet:w-2/3">
                  <Text className="m-0 text-sm tablet:text-base whitespace-nowrap" style={{ color: '#fff', fontSize: '13px' }}>{phone_number || 'Nezadáno'}</Text>
                </Column>
              </Row>
              <Row>
                <Column className="w-full tablet:w-1/3 mb-2 tablet:mb-0">
                  <Text className="font-semibold m-0 text-sm tablet:text-base whitespace-nowrap" style={{ color: '#4bdadc', fontSize: '13px' }}>Datum:</Text>
                </Column>
                <Column className="w-full tablet:w-2/3">
                  <Text className="m-0 text-sm tablet:text-base whitespace-nowrap" style={{ color: '#fff', fontSize: '13px' }}>{formatDate(inquiryDate)}</Text>
                </Column>
              </Row>
            </Section>

            {/* Service Details */}
            <Section className="border rounded-lg p-6 tablet:p-8 mb-6 tablet:mb-8 shadow-sm hover:shadow-lg transition-all duration-200" style={{ backgroundColor: 'rgba(75, 218, 220, 0.1)', borderColor: '#4bdadc' }}>
              <Heading className="font-semibold mb-4 tablet:mb-6 text-lg tablet:text-xl" style={{ color: '#fff', fontSize: '21px', fontFamily: 'Switzer, sans-serif' }}>
                Požadované služby
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
            </Section>

            {/* Message */}
            {message && (
              <Section className="border rounded-lg p-6 tablet:p-8 mb-6 tablet:mb-8 shadow-sm hover:shadow-lg transition-all duration-200" style={{ backgroundColor: '#063F66', borderColor: '#5E758D' }}>
                <Heading className="font-semibold mb-4 tablet:mb-6 text-lg tablet:text-xl" style={{ color: '#fff', fontSize: '21px', fontFamily: 'Switzer, sans-serif' }}>
                  Zpráva od klienta
                </Heading>
                <Text className="m-0 whitespace-pre-wrap text-md tablet:text-base" style={{ color: '#fff' }}>
                  "{message}"
                </Text>
              </Section>
            )}

            {/* Action Buttons */}
            <Section className="text-center mb-6 tablet:mb-8">
              <Row className="mb-2">
                <Column className="w-full tablet:w-1/3 mb-4 tablet:mb-0 tablet:pr-1">
                  <Link
                    href={`mailto:${email}?subject=Zájem o naše služby`}
                    className="px-3 py-3 tablet:px-4 tablet:py-4 rounded-lg font-semibold inline-block transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 w-full text-center text-sm tablet:text-base max-w-[200px] min-w-[150px]"
                    style={{ backgroundColor: '#9151e0', color: '#fff', fontSize: '13px', textDecoration: 'none', cursor: "pointer" }}
                  >
                    Email
                  </Link>
                </Column>
                {/* <Column className="w-full tablet:w-1/3 tablet:pl-1">
                  <Link
                    href="https://prochazka.group/admin/inquiries"
                    className="px-3 py-3 tablet:px-4 tablet:py-4 rounded-lg font-semibold inline-block transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 w-full text-center text-sm tablet:text-base"
                    style={{ backgroundColor: '#5E758D', color: '#fff', fontSize: '13px', textDecoration: 'none' }}
                  >
                    Spravovat
                  </Link>
                </Column> */}
              </Row>
              <Row>
                <Column className="w-full tablet:w-1/3 mb-4 tablet:mb-0 tablet:px-1">
                  <Link
                    href={`tel:${phone_number}`}
                    className="px-3 py-3 tablet:px-4 tablet:py-4 rounded-lg font-semibold inline-block transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 w-full text-center text-sm tablet:text-base max-w-[200px] min-w-[150px]"
                    style={{ backgroundColor: '#4bdadc', color: '#050A10', fontSize: '13px', textDecoration: 'none', cursor: "pointer" }}
                  >
                    Zavolat
                  </Link>
                </Column>
              </Row>
            </Section>

            {/* Response Guidelines */}
            <Section className="border rounded-lg p-6 tablet:p-8 mb-6 tablet:mb-8 shadow-sm hover:shadow-lg transition-all duration-200" style={{ backgroundColor: 'rgba(145, 81, 224, 0.1)', borderColor: '#9151e0' }}>
              <Heading className="font-semibold mb-2 tablet:mb-3 text-lg tablet:text-xl" style={{ color: '#9151e0', fontSize: '21px', fontFamily: 'Switzer, sans-serif' }}>
                📞 Doporučení pro kontakt
              </Heading>
              <Text className="m-0 mb-3 tablet:mb-4 text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>
                Při kontaktování klienta:
              </Text>
              <Text className="m-0 mb-1 tablet:mb-2 text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>• Kontaktujte do 24 hodin</Text>
              <Text className="m-0 mb-1 tablet:mb-2 text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>• Představte se a odkažte na jejich zájem</Text>
              <Text className="m-0 mb-1 tablet:mb-2 text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>• Zeptejte se na detaily a požadavky</Text>
              <Text className="m-0 mb-1 tablet:mb-2 text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>• Nabídněte bezplatnou konzultaci</Text>
              <Text className="m-0 text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>
                • Sledujte komunikaci v CRM systému
              </Text>
            </Section>
          </Container>

          {/* Footer */}
          <Section className="p-6 tablet:p-8" style={{ backgroundColor: 'rgba(117, 171, 192, 0.1)' }}>
            <Text className="text-center mb-4 tablet:mb-6 text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>
              Tento email byl automaticky odeslán z kontaktního formuláře Procházka Group.
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

export const zajemAdminEmail = (props) => {
  return <ZajemAdminEmailComponent {...props} />
}

// Export subject for use in API
export const subject = ({ name }) => `Nový zájem o služby - ${name}`;

// Mock data for development
const mockZajemAdmin = {
  name: "Marie Nováková",
  email: "marie.novakova@email.cz",
  phone_number: "+420 777 123 456",
  consultant_name: "Jan Procházka",
  message: "Dobrý den, zajímám se o vaše služby finančního plánování. Mám několik otázek ohledně investičních možností a chtěla bych se domluvit na schůzce.",
  inquiryDate: "2025-01-15"
}

// @ts-ignore
export default () => <ZajemAdminEmailComponent {...mockZajemAdmin} />
