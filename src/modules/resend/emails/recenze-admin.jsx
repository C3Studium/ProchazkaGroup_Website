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

function RecenzeAdminEmailComponent({ customerName, email, message, consultantName, hashtag, created_at }) {
  const formatDate = (date) => {
    if (!date) return new Date().toLocaleDateString('cs-CZ')
    return new Date(date).toLocaleDateString('cs-CZ')
  }

  const renderStars = (rating) => {
    const stars = []
    for (let i = 1; i <= 5; i++) {
      stars.push(i <= rating ? '⭐' : '☆')
    }
    return stars.join('')
  }

  return (
    <Tailwind>
      <Html className="font-sans" style={{ fontFamily: 'Satoshi, sans-serif' }}>
        <Head>
          <link rel="stylesheet" href="https://prochazka.group/css/satoshi.css" />
          <link rel="stylesheet" href="https://prochazka.group/css/switzer.css" />
        </Head>
        <Preview>Nová recenze - {customerName} (5/5)</Preview>
        <Body className="mx-auto w-full max-w-2xl tablet:max-w-3xl" style={{ backgroundColor: '#063F66' }}>
          {/* Header */}
          <Section className="text-white px-6 py-4 tablet:px-8 tablet:py-5" style={{ backgroundColor: '#9151e0' }}>
            <Heading className="font-bold m-0 text-lg tablet:text-xl" style={{ fontSize: '21px', fontFamily: 'Switzer, sans-serif' }}>
              Procházka Group - Nová recenze
            </Heading>
          </Section>

          {/* Main Content */}
          <Container className="p-6 tablet:p-8" style={{ backgroundColor: '#050A10' }}>
            <Heading className="font-light text-center mb-6 text-2xl tablet:text-4xl" style={{ color: '#fff', fontSize: '34px', fontFamily: 'Switzer, sans-serif' }}>
              Nová recenze od: <br/>
              <span className="text-[#4bdadc]">{customerName}</span>
            </Heading>

            <Section className="border rounded-lg p-6 tablet:p-8 mb-6 tablet:mb-8 shadow-sm hover:shadow-lg transition-all duration-200" style={{ backgroundColor: 'rgba(145, 81, 224, 0.1)', borderColor: '#9151e0' }}>
              <Heading className="font-semibold mb-2 tablet:mb-3 text-lg tablet:text-xl" style={{ color: '#9151e0', fontSize: '21px', fontFamily: 'Switzer, sans-serif' }}>
                ⭐ Nové hodnocení: 
              </Heading>
              <Text className="m-0 text-md tablet:text-base" style={{ color: '#fff' }}>
                Klient {customerName} ohodnotil naše služby. Zkontrolujte recenzi a případně odpovězte.
              </Text>
            </Section>

            {/* Review Details */}
            <Section className="rounded-lg p-6 tablet:p-8 mb-6 tablet:mb-8 shadow-sm hover:shadow-lg transition-all duration-200" style={{ backgroundColor: 'rgba(117, 171, 192, 0.1)' }}>
              <Heading className="font-semibold mb-4 tablet:mb-6 text-lg tablet:text-xl" style={{ color: '#fff', fontSize: '21px', fontFamily: 'Switzer, sans-serif' }}>
                Detaily recenze
              </Heading>
              <Row className="mb-3 tablet:mb-4">
                <Column className="w-full tablet:w-1/3 mb-2 tablet:mb-0">
                  <Text className="font-semibold m-0 text-sm tablet:text-base" style={{ color: '#4bdadc', fontSize: '13px' }}>Klient:</Text>
                </Column>
                <Column className="w-full tablet:w-2/3">
                  <Text className="m-0 text-sm tablet:text-base whitespace-nowrap" style={{ color: '#fff', fontSize: '13px' }}>{customerName}</Text>
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
                  <Text className="font-semibold m-0 text-sm tablet:text-base" style={{ color: '#4bdadc', fontSize: '13px' }}>Hodnocení:</Text>
                </Column>
                <Column className="w-full tablet:w-2/3">
                  <Text className="font-semibold m-0 text-sm tablet:text-base whitespace-nowrap" style={{ color: '#9151e0', fontSize: '13px' }}>{renderStars(5)} (5/5)</Text>
                </Column>
              </Row>
              <Row className="mb-3 tablet:mb-4">
                <Column className="w-full tablet:w-1/3 mb-2 tablet:mb-0">
                  <Text className="font-semibold m-0 text-sm tablet:text-base" style={{ color: '#4bdadc', fontSize: '13px' }}>Jméno Poradce:</Text>
                </Column>
                <Column className="w-full tablet:w-2/3">
                  <Text className="m-0 text-sm tablet:text-base whitespace-nowrap" style={{ color: '#fff', fontSize: '13px' }}>{consultantName || hashtag}</Text>
                </Column>
              </Row>
              <Row>
                <Column className="w-full tablet:w-1/3 mb-2 tablet:mb-0">
                  <Text className="font-semibold m-0 text-sm tablet:text-base" style={{ color: '#4bdadc', fontSize: '13px' }}>Datum:</Text>
                </Column>
                <Column className="w-full tablet:w-2/3">
                  <Text className="m-0 text-sm tablet:text-base whitespace-nowrap" style={{ color: '#fff', fontSize: '13px' }}>{formatDate(created_at)}</Text>
                </Column>
              </Row>
            </Section>

            {/* Review Content */}
            {message && (
              <Section className="border rounded-lg p-6 tablet:p-8 mb-6 tablet:mb-8 shadow-sm hover:shadow-lg transition-all duration-200" style={{ backgroundColor: '#063F66', borderColor: '#5E758D' }}>
                <Heading className="font-semibold mb-4 tablet:mb-6 text-lg tablet:text-xl" style={{ color: '#fff', fontSize: '21px', fontFamily: 'Switzer, sans-serif' }}>
                  Text recenze
                </Heading>
                <Text className="m-0 whitespace-pre-wrap text-md tablet:text-base" style={{ color: '#fff'}}>
                  "{message}"
                </Text>
              </Section>
            )}

            {/* Action Buttons */}
            <Section className="text-center mb-6 tablet:mb-8">
              <Row>
                <Column className="w-full tablet:w-1/2 mb-4 tablet:mb-0 tablet:pr-2">
                  <Link
                    href={`mailto:${email}?subject=Děkujeme za vaši recenzi`}
                    className="px-4 py-3 tablet:px-6 tablet:py-4 rounded-lg font-semibold inline-block transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 w-full text-center text-sm tablet:text-base min-w-[150px] max-w-[200px]"
                    style={{ backgroundColor: '#9151e0', color: '#fff', fontSize: '13px', textDecoration: 'none', cursor: "pointer" }}
                  >
                    Poděkovat klientovi
                  </Link>
                </Column>
                {/* <Column className="w-full tablet:w-1/2 tablet:pl-2">
                  <Link
                    href="https://prochazka.group/admin/reviews"
                    className="px-4 py-3 tablet:px-6 tablet:py-4 rounded-lg font-semibold inline-block transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 w-full text-center text-sm tablet:text-base min-w-[150px] max-w-[200px]"
                    style={{ backgroundColor: '#5E758D', color: '#fff', fontSize: '13px', textDecoration: 'none' }}
                  >
                    Spravovat recenze
                  </Link>
                </Column> */}
              </Row>
            </Section>

            {/* Response Guidelines */}
            <Section className="border rounded-lg p-6 tablet:p-8 mb-6 tablet:mb-8 shadow-sm hover:shadow-lg transition-all duration-200" style={{ backgroundColor: 'rgba(75, 218, 220, 0.1)', borderColor: '#4bdadc' }}>
              <Heading className="font-semibold mb-2 tablet:mb-3 text-lg tablet:text-xl" style={{ color: '#4bdadc', fontSize: '21px', fontFamily: 'Switzer, sans-serif' }}>
                📝 Doporučení pro odpověď
              </Heading>
              <Text className="m-0 mb-3 tablet:mb-4 text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>
                Při odpovědi na recenzi:
              </Text>
              <Text className="m-0 mb-1 tablet:mb-2 text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>• Poděkujte za zpětnou vazbu</Text>
              <Text className="m-0 mb-1 tablet:mb-2 text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>• Adresujte konkrétní body z recenze</Text>
              <Text className="m-0 mb-1 tablet:mb-2 text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>• Nabídněte pomoc při řešení problémů</Text>
              <Text className="m-0 text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>
                • Pozvěte na další spolupráci
              </Text>
            </Section>
          </Container>

          {/* Footer */}
          <Section className="p-6 tablet:p-8" style={{ backgroundColor: 'rgba(117, 171, 192, 0.1)' }}>
            <Text className="text-center mb-4 tablet:mb-6 text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>
              Tento email byl automaticky odeslán z recenzního systému Procházka Group.
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

export const recenzeAdminEmail = (props) => {
  return <RecenzeAdminEmailComponent {...props} />
}

// Export subject for use in API
export const subject = ({ customerName }) => `Nová recenze - ${customerName} (5/5)`;

// Mock data for development
const mockRecenzeAdmin = {
  customerName: "Michal Horák",
  email: "michal.horak@email.cz",
  message: "Výborné služby! Paní poradce byla velmi profesionální a pomohla mi najít nejlepší řešení pro moje finanční plánování. Určitě doporučuji!",
  consultantName: "Finanční plánování",
  hashtag: "poradce",
  created_at: "2025-01-15"
}

// @ts-ignore
export default () => <RecenzeAdminEmailComponent {...mockRecenzeAdmin} />
