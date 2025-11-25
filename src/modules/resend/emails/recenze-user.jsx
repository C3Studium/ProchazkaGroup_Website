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

function RecenzeUserEmailComponent({ customerName, email, message, consultantName, hashtag, created_at }) {
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
        <Preview>Děkujeme za vaši recenzi! - Procházka Group</Preview>
        <Body className="my-10 mx-auto w-full max-w-2xl tablet:max-w-3xl" style={{ backgroundColor: '#063F66' }}>
          {/* Header */}
          <Section className="text-white px-6 py-4 tablet:px-8 tablet:py-5" style={{ backgroundColor: '#9151e0' }}>
            <Heading className="font-bold m-0 text-lg tablet:text-xl" style={{ fontSize: '21px', fontFamily: 'Switzer, sans-serif' }}>
              Procházka Group - Děkujeme za recenzi
            </Heading>
          </Section>

          {/* Main Content */}
          <Container className="p-6 tablet:p-8" style={{ backgroundColor: '#050A10' }}>
            <Heading className="font-light text-center mb-1 text-4xl tablet:text-5xl" style={{ color: '#fff', fontFamily: 'Switzer, sans-serif' }}>
              Děkujeme za vaši zpětnou vazbu, {customerName}!
            </Heading>

            <Section className="border rounded-lg p-6 tablet:p-8 mb-6 tablet:mb-8 shadow-sm hover:shadow-lg transition-all duration-200" style={{ backgroundColor: 'rgba(75, 218, 220, 0.1)', borderColor: '#4bdadc' }}>
              <Heading className="font-semibold mb-2 tablet:mb-3 text-lg tablet:text-xl" style={{ color: '#4bdadc', fontSize: '21px', fontFamily: 'Switzer, sans-serif' }}>
                ✅ Vaše recenze byla úspěšně odeslána
              </Heading>
              <Text className="m-0 text-md tablet:text-base" style={{ color: '#fff'}}>
                Vaše hodnocení a zpětná vazba jsou pro nás velmi cenné. Pomáhají nám zlepšovat naše služby.
              </Text>
            </Section>

            {/* Review Summary */}
            <Section className="rounded-lg p-6 tablet:p-8 mb-6 tablet:mb-8 shadow-sm hover:shadow-lg transition-all duration-200" style={{ backgroundColor: 'rgba(117, 171, 192, 0.1)' }}>
              <Heading className="font-semibold mb-4 tablet:mb-6 text-lg tablet:text-xl" style={{ color: '#fff', fontSize: '21px', fontFamily: 'Switzer, sans-serif' }}>
                Shrnutí vaší recenze
              </Heading>
              <Row className="mb-3 tablet:mb-4">
                <Column className="w-full tablet:w-1/3 mb-2 tablet:mb-0">
                  <Text className="font-semibold m-0 text-sm tablet:text-base" style={{ color: '#4bdadc', fontSize: '13px' }}>Vaše hodnocení:</Text>
                </Column>
                <Column className="w-full tablet:w-2/3">
                  <Text className="font-semibold m-0 text-sm tablet:text-base whitespace-nowrap" style={{ color: '#9151e0', fontSize: '13px' }}>{renderStars(5)} (5/5)</Text>
                </Column>
              </Row>
              <Row className="mb-3 tablet:mb-4">
                <Column className="w-full tablet:w-1/3 mb-2 tablet:mb-0">
                  <Text className="font-semibold m-0 text-sm tablet:text-base" style={{ color: '#4bdadc', fontSize: '13px' }}>Služba:</Text>
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
                  Váš komentář
                </Heading>
                <Text className="m-0 whitespace-pre-wrap text-md tablet:text-base" style={{ color: '#fff' }}>
                  "{message}"
                </Text>
              </Section>
            )}

            {/* Next Steps */}
            <Section className="border rounded-lg p-6 tablet:p-8 mb-6 tablet:mb-8 shadow-sm hover:shadow-lg transition-all duration-200" style={{ backgroundColor: 'rgba(75, 218, 220, 0.1)', borderColor: '#4bdadc' }}>
              <Heading className="font-semibold mb-2 tablet:mb-3 text-lg tablet:text-xl" style={{ color: '#4bdadc', fontSize: '21px', fontFamily: 'Switzer, sans-serif' }}>
                📝 Co se bude dít dále?
              </Heading>
              <Text className="m-0 mb-3 tablet:mb-4 text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>
                Vaše recenze bude:
              </Text>
              <Text className="m-0 mb-1 tablet:mb-2 text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>• Zkontrolována naším týmem</Text>
              <Text className="m-0 mb-1 tablet:mb-2 text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>• Zveřejněna na našich stránkách</Text>
              <Text className="m-0 mb-1 tablet:mb-2 text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>• Použita pro zlepšení našich služeb</Text>
              <Text className="m-0 text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>
                • V případě dotazů vás budeme kontaktovat
              </Text>
            </Section>

            {/* CTA */}
            <Section className="text-center mb-6 tablet:mb-8">
              <Link
                href="https://prochazka.group.cz"
                className="px-6 py-3 tablet:px-8 tablet:py-4 rounded-lg font-semibold inline-block transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 text-sm tablet:text-base"
                style={{ backgroundColor: '#9151e0', color: '#fff', fontSize: '13px', textDecoration: 'none', cursor: "pointer" }}
              >
                Navštívit naše stránky
              </Link>
            </Section>

            {/* Contact Info */}
            <Section className="rounded-lg p-6 tablet:p-8 mb-6 tablet:mb-8 shadow-sm hover:shadow-lg transition-all duration-200" style={{ backgroundColor: 'rgba(117, 171, 192, 0.1)' }}>
              <Heading className="font-semibold mb-4 tablet:mb-6 text-lg tablet:text-xl" style={{ color: '#fff', fontSize: '21px', fontFamily: 'Switzer, sans-serif' }}>
                Máte další otázky?
              </Heading>
              <Text className="m-0 mb-2 tablet:mb-3 text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>
                Pokud máte jakékoliv další otázky nebo chcete upravit svou recenzi, neváhejte nás kontaktovat:
              </Text>
              <Text className="m-0 text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>
                📧 Email: <Link href="mailto:asistentka.prochazka@ovbone.cz" style={{ color: '#4bdadc', textDecoration: 'none', cursor: "pointer" }}>asistentka.prochazka@ovbone.cz</Link>
              </Text>
              <Text className="m-0 text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>
                📞 Telefon: <Link href="tel:+420705500200" style={{ color: '#4bdadc', textDecoration: 'none', cursor: "pointer" }}>+420 705 500 200</Link>
              </Text>
            </Section>
          </Container>

          {/* Footer */}
           <Section className="text-white p-8 tablet:p-10 mt-10 tablet:mt-12" style={{ backgroundColor: '#050A10' }}>
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

export const recenzeUserEmail = (props) => {
  return <RecenzeUserEmailComponent {...props} />
}

// Export subject for use in API
export const subject = ({ customerName }) => `Děkujeme za vaši recenzi - ${customerName}`;

// Mock data for development
const mockRecenzeUser = {
  customerName: "Michal Horák",
  email: "michal.horak@email.cz",
  message: "Výborné služby! Paní poradce byla velmi profesionální a pomohla mi najít nejlepší řešení pro moje finanční plánování. Určitě doporučuji!",
  consultantName: "Finanční plánování",
  hashtag: "poradce",
  created_at: "2025-01-15"
}

// @ts-ignore
export default () => <RecenzeUserEmailComponent {...mockRecenzeUser} />
