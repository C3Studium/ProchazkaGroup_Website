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

function NewsletterAdminEmailComponent({ name, email, subscriptionDate }) {
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
        <Preview>Nový odběratel newsletteru - {name}</Preview>
        <Body className="mx-auto w-full max-w-2xl tablet:max-w-3xl" style={{ backgroundColor: '#063F66' }}>
          {/* Header */}
          <Section className="text-white px-6 py-4 tablet:px-8 tablet:py-5" style={{ backgroundColor: '#9151e0' }}>
            <Heading className="font-bold m-0 text-xl tablet:text-2xl" style={{ fontFamily: 'Switzer, sans-serif' }}>
              Procházka Group - Nový odběratel newsletteru
            </Heading>
          </Section>

          {/* Main Content */}
          <Container className="p-6 tablet:p-8" style={{ backgroundColor: '#050A10' }}>
            <Heading className="font-light text-center mb-6 text-2xl tablet:text-4xl" style={{ color: '#fff', fontSize: '34px', fontFamily: 'Switzer, sans-serif' }}>
              Nový odběratel newsletteru: <br/>
              <span className="text-[#4bdadc]">{name}</span>
            </Heading>

            <Section className="border rounded-lg p-6 tablet:p-8 mb-6 tablet:mb-8 shadow-sm hover:shadow-lg transition-all duration-200" style={{ backgroundColor: 'rgba(75, 218, 220, 0.1)', borderColor: '#4bdadc' }}>
              <Heading className="font-semibold mb-2 tablet:mb-3 text-lg tablet:text-xl" style={{ color: '#4bdadc', fontSize: '21px', fontFamily: 'Switzer, sans-serif' }}>
                📧 Nový odběratel přihlášen
              </Heading>
              <Text className="m-0 text-md tablet:text-base" style={{ color: '#fff' }}>
                Uživatel {name} se úspěšně přihlásil k odběru newsletteru. Můžete začít posílat pravidelné aktualizace.
              </Text>
            </Section>

            {/* Subscriber Details */}
            <Section className="rounded-lg p-6 tablet:p-8 mb-6 tablet:mb-8 shadow-sm hover:shadow-lg transition-all duration-200" style={{ backgroundColor: 'rgba(117, 171, 192, 0.1)' }}>
              <Heading className="font-semibold mb-4 tablet:mb-6 text-lg tablet:text-xl" style={{ color: '#fff', fontSize: '21px', fontFamily: 'Switzer, sans-serif' }}>
                Detaily odběratele
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
                  <Text className="font-semibold m-0 text-sm tablet:text-base" style={{ color: '#4bdadc', fontSize: '13px' }}>Datum přihlášení:</Text>
                </Column>
                <Column className="w-full tablet:w-2/3">
                  <Text className="m-0 text-sm tablet:text-base whitespace-nowrap" style={{ color: '#fff', fontSize: '13px' }}>{formatDate(subscriptionDate)}</Text>
                </Column>
              </Row>
              {subscriptionDate && (
                <Row>
                  <Column className="w-full tablet:w-1/3 mb-2 tablet:mb-0">
                    <Text className="font-semibold m-0 text-sm tablet:text-base" style={{ color: '#4bdadc', fontSize: '13px' }}>Začátek přihlášení:</Text>
                  </Column>
                  <Column className="w-full tablet:w-2/3">
                    <Text className="m-0 text-sm tablet:text-base whitespace-nowrap" style={{ color: '#fff', fontSize: '13px' }}>{formatDate(subscriptionDate)}</Text>
                  </Column>
                </Row>
              )}
            </Section>

            {/* Action Buttons */}
            <Section className="text-center mb-6 tablet:mb-8">
              <Row className="mb-2">
                <Column className="w-full tablet:w-1/2 mb-4 tablet:mb-0 tablet:pr-2">
                  <Link
                    href={`mailto:${email}?subject=Vítejte v newsletteru Procházka Group`}
                    className="px-4 py-3 tablet:px-6 tablet:py-4 rounded-lg font-semibold inline-block transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 w-full text-center text-sm tablet:text-base min-w-[150px] max-w-[200px]"
                    style={{ backgroundColor: '#9151e0', color: '#fff', fontSize: '13px', textDecoration: 'none', cursor: "pointer" }}
                  >
                    Poslat uvítací email
                  </Link>
                </Column>
              </Row>
              {/* <Row>
                <Column className="w-full tablet:w-1/2 tablet:pl-2">
                  <Link
                    href="https://prochazka.group/admin/newsletter"
                    className="px-4 py-3 tablet:px-6 tablet:py-4 rounded-lg font-semibold inline-block transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 w-full text-center text-sm tablet:text-base min-w-[150px] max-w-[200px]"
                    style={{ backgroundColor: '#5E758D', color: '#fff', fontSize: '13px', textDecoration: 'none' }}
                  >
                    Spravovat odběratele
                  </Link>
                </Column>
              </Row> */}
            </Section>

            {/* Statistics */}
            <Section className="border rounded-lg p-6 tablet:p-8 mb-6 tablet:mb-8 shadow-sm hover:shadow-lg transition-all duration-200" style={{ backgroundColor: 'rgba(75, 218, 220, 0.1)', borderColor: '#4bdadc' }}>
              <Heading className="font-semibold mb-2 tablet:mb-3 text-lg tablet:text-xl" style={{ color: '#4bdadc', fontSize: '21px', fontFamily: 'Switzer, sans-serif' }}>
                📊 Newsletter statistiky
              </Heading>
              <Text className="m-0 text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>
                Tento uživatel je součástí rostoucí komunity našich odběratelů. Pravidelně informujte o novinkách a nabídkách.
              </Text>
            </Section>
          </Container>

          {/* Footer */}
          <Section className="p-6 tablet:p-8" style={{ backgroundColor: 'rgba(117, 171, 192, 0.1)' }}>
            <Text className="text-center mb-4 tablet:mb-6 text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>
              Tento email byl automaticky odeslán z newsletterového systému Procházka Group.
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

export const newsletterAdminEmail = (props) => {
  return <NewsletterAdminEmailComponent {...props} />
}

// Export subject for use in API
export const subject = ({ name }) => `Nový odběratel newsletteru - ${name}`;

// Mock data for development
const mockNewsletterAdmin = {
  name: "Tomáš Veselý",
  email: "tomas.vesely@email.cz",
  subscriptionDate: "2025-01-15"
}

// @ts-ignore
export default () => <NewsletterAdminEmailComponent {...mockNewsletterAdmin} />
