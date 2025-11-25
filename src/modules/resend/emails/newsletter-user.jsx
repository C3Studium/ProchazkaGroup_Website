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

function NewsletterUserEmailComponent({
  name,
  email,
  personalizedGreeting,
  segment = "new",
  timeContext = "morning"
}) {
  return (
    <Tailwind>
      <Html className="font-sans" style={{ fontFamily: 'Satoshi, sans-serif' }}>
        <Head>
          <link rel="stylesheet" href="https://prochazka.group/css/satoshi.css" />
          <link rel="stylesheet" href="https://prochazka.group/css/switzer.css" />
        </Head>
        <Preview>Vaše žádost byla přijata - Procházka Group</Preview>
        <Body className="mx-auto w-full max-w-2xl tablet:max-w-3xl" style={{ backgroundColor: '#063F66' }}>
          {/* Enhanced Header with Trust Signals */}
          <Section className="text-white px-6 py-8 tablet:px-8 tablet:py-10 relative overflow-hidden" style={{ background: 'linear-gradient(to right, #9151e0, #4bdadc)' }}>
            <div className="absolute inset-0 opacity-90" style={{ background: 'linear-gradient(to right, #9151e0, #4bdadc)' }}></div>
            <div className="relative z-10">
              <Heading className="font-bold m-0 mb-2 text-3xl tablet:text-4xl" style={{ fontSize: '34px', fontFamily: 'Switzer, sans-serif' }}>
               Procházka Group Newsletter
              </Heading>
              <Text className="m-0 text-sm tablet:text-base" style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>
                💰 Měsíční tipy • Exkluzivní nabídky • Finanční vzdělání
              </Text>
            </div>
          </Section>

          {/* Main Content */}
          <Container className="p-6 tablet:p-8">
            <Heading className="font-light text-center mb-1 text-4xl tablet:text-5xl" style={{ color: '#fff', fontFamily: 'Switzer, sans-serif' }}>
              Vítejte v naši komunitě klientů, {name}!
            </Heading>

            <Section className="border rounded-lg p-6 tablet:p-8 mb-6 tablet:mb-8 shadow-sm hover:shadow-lg transition-all duration-200" style={{ backgroundColor: 'rgba(75, 218, 220, 0.1)', borderColor: '#4bdadc' }}>
              <Heading className="font-semibold mb-2 tablet:mb-3 text-lg tablet:text-xl" style={{ color: '#4bdadc', fontSize: '21px', fontFamily: 'Switzer, sans-serif' }}>
                ✅ Děkujeme za váš zájem o náš newsletter
              </Heading>
              <Text className="m-0 text-md tablet:text-base" style={{ color: '#fff'}}>
                Vaše přihláška byla úspěšně zpracována. Oceňujeme váš zájem o naše finanční tipy a rady.
              </Text>
            </Section>

            <Section className="border rounded-lg p-6 tablet:p-8 mb-6 tablet:mb-8 shadow-sm hover:shadow-lg transition-all duration-200" style={{ backgroundColor: 'rgba(145, 81, 224, 0.1)', borderColor: '#9151e0' }}>
              <Heading className="font-semibold mb-2 tablet:mb-3 text-lg tablet:text-xl" style={{ color: '#9151e0', fontSize: '21px', fontFamily: 'Switzer, sans-serif' }}>
                🚧 Náš newsletter je právě ve vývoji
              </Heading>
              <Text className="m-0 mb-3 tablet:mb-4 text-md tablet:text-base" style={{ color: '#fff'}}>
                Právě připravujeme obsah plný užitečných finančních tipů, exkluzivních nabídek a tržních analýz.
              </Text>
              <Text className="m-0 text-md tablet:text-base" style={{ color: '#fff' }}>
                Jakmile bude newsletter připravený, budete mezi prvními, kdo ho obdrží!
              </Text>
            </Section>

            {/* Preferences Display */}
            {/* <Section className="rounded-lg p-6 tablet:p-8 mb-6 tablet:mb-8 shadow-sm hover:shadow-lg transition-all duration-200" style={{ backgroundColor: 'rgba(117, 171, 192, 0.1)' }}>
              <Heading className="font-semibold mb-4 tablet:mb-6 text-lg tablet:text-xl" style={{ color: '#fff', fontSize: '21px', fontFamily: 'Switzer, sans-serif' }}>
                📋 Výchozí předvolby newsletteru
              </Heading>
              <div className="space-y-2 tablet:space-y-3">
                <div className="flex items-center space-x-2">
                  <Text className="text-sm tablet:text-base" style={{ color: '#4bdadc', fontSize: '13px' }}>✅</Text>
                  <Text className="m-0 text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>Finanční tipy a strategie</Text>
                </div>
                <div className="flex items-center space-x-2">
                  <Text className="text-sm tablet:text-base" style={{ color: '#4bdadc', fontSize: '13px' }}>✅</Text>
                  <Text className="m-0 text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>Aktuální nabídky služeb</Text>
                </div>
                <div className="flex items-center space-x-2">
                  <Text className="text-sm tablet:text-base" style={{ color: '#4bdadc', fontSize: '13px' }}>✅</Text>
                  <Text className="m-0 text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>Tržní analýzy</Text>
                </div>
              </div>

              <div className="mt-4 tablet:mt-6 pt-4 tablet:pt-6" style={{ borderTop: '1px solid #5E758D' }}>
                <Link
                  href="https://prochazka.group/preferences"
                  className="font-medium text-sm tablet:text-base"
                  style={{ color: '#4bdadc', textDecoration: 'none', fontSize: '13px' }}
                >
                  Upravit předvolby →
                </Link>
              </div>
            </Section> */}

            <Section className="text-center mb-6 tablet:mb-8">
              <Text className="mb-4 tablet:mb-6 text-md tablet:text-base" style={{ color: '#fff' }}>
                Mezitím nás můžete sledovat na sociálních sítích nebo navštívit naše webové stránky.
              </Text>
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
                Máte otázky?
              </Heading>
              <Text className="m-0 mb-2 tablet:mb-3 text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>
                Pokud máte jakékoliv otázky nebo chcete upravit své předvolby, neváhejte nás kontaktovat:
              </Text>
              <Text className="m-0 text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>
                📧 Email: <Link href="mailto:asistentka.prochazka@ovbone.cz" style={{ color: '#4bdadc', textDecoration: 'none', cursor: "pointer" }}>info@prochazka.group</Link>
              </Text>
              <Text className="m-0 text-sm tablet:text-base" style={{ color: '#fff', fontSize: '13px' }}>
                📞 Telefon: <Link href="tel:+420705500200" style={{ color: '#4bdadc', textDecoration: 'none', cursor: "pointer" }}>+420 123 456 789</Link>
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
                <Link href="https://www.prochazkagroup.cz/ochrana-soukromi" className="hover:text-white transition-colors duration-200" style={{ textDecoration: 'none' }}>GDPR Ochrana soukromí</Link>
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

export const newsletterUserEmail = (props) => {
  return <NewsletterUserEmailComponent {...props} />
}

// Export subject for use in API
export const subject = ({ name }) => `Děkujeme za váš zájem o náš newsletter`;

// Mock data for development
const mockNewsletterUser = {
  name: "Jan Novák",
  email: "jan.novak@email.cz",
  segment: "new",
  timeContext: "morning"
}

// @ts-ignore
export default () => <NewsletterUserEmailComponent {...mockNewsletterUser} />



// import {
//   Text,
//   Column,
//   Container,
//   Heading,
//   Html,
//   Img,
//   Row,
//   Section,
//   Tailwind,
//   Head,
//   Preview,
//   Body,
//   Link
// } from "@react-email/components"

// function NewsletterUserEmailComponent({
//   name,
//   email,
//   preferences,
//   personalizedGreeting,
//   segment,
//   timeContext
// }) {
//   const getPersonalizedContent = (segment) => {
//     const content = {
//       new: {
//         title: "Vítejte v komunitě finančně úspěšných lidí!",
//         valueProp: "Každý měsíc získáte exkluzivní tipy, které vám ušetří tisíce korun",
//         cta: "Začít šetřit s našimi tipy",
//         urgency: "První tip zdarma právě teď!"
//       },
//       engaged: {
//         title: "Vítejte zpět, našemu aktivnímu čtenáři!",
//         valueProp: "Jako náš pravidelný čtenář máte přístup k pokročilým strategiím",
//         cta: "Prozkoumat pokročilé tipy",
//         urgency: "Nový tip: Jak získat 15% úrok na spoření!"
//       },
//       highly_engaged: {
//         title: "Vítejte zpět, našemu VIP čtenáři!",
//         valueProp: "Exkluzivní obsah jen pro naše nejvěrnější čtenáře",
//         cta: "Získat VIP obsah zdarma",
//         urgency: "Speciální nabídka: Bezplatná konzultace pro vás!"
//       }
//     }
//     return content[segment] || content.new
//   }

//   const content = getPersonalizedContent(segment)

//   return (
//     <Tailwind>
//       <Html className="font-sans bg-gray-100">
//         <Head />
//         <Preview>Vítejte v newsletteru - První exkluzivní tip ZDARMA!</Preview>
//         <Body className="bg-white my-10 mx-auto w-full max-w-2xl">
//           {/* Enhanced Header */}
//           <Section className="bg-gradient-to-r from-[#964BF2] to-[#7c3aed] text-white px-6 py-8 relative overflow-hidden">
//             <div className="absolute inset-0 bg-gradient-to-r from-[#964BF2] to-[#7c3aed] opacity-90"></div>
//             <div className="relative z-10">
//               <Heading className="text-2xl font-bold m-0 mb-2">
//                 Procházka Group Newsletter
//               </Heading>
//               <Text className="text-purple-100 m-0 text-sm">
//                 💰 Měsíční tipy • Exkluzivní nabídky • Finanční vzdělání
//               </Text>
//             </div>
//           </Section>

//           {/* Main Content */}
//           <Container className="p-6">
//             <Heading className="text-3xl font-bold text-center text-gray-800 mb-2">
//               {personalizedGreeting || `Dobrý den ${name}!`}
//             </Heading>

//             <Text className="text-center text-gray-600 mb-8 text-lg">
//               {content.valueProp}
//             </Text>

//             {/* Success Confirmation */}
//             <Section className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-8 mb-8 shadow-sm">
//               <div className="text-center mb-6">
//                 <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
//                   <Text className="text-3xl">🎉</Text>
//                 </div>
//                 <Heading className="text-2xl font-bold text-green-800 mb-2">
//                   {content.title}
//                 </Heading>
//               </div>

//               <Text className="text-green-700 m-0 text-center text-lg leading-relaxed">
//                 Úspěšně jste se přihlásili k odběru našeho newsletteru! Od nynějška budete každý měsíc
//                 dostávat ověřené finanční tipy, které vám pomohou ušetřit a zhodnotit vaše peníze.
//               </Text>
//             </Section>

//             {/* First Value-Bomb - IMMEDIATE ENGAGEMENT */}
//             <Section className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 mb-8">
//               <Heading className="text-2xl font-bold text-yellow-800 mb-4 text-center">
//                 🎁 První tip ZDARMA: {content.urgency}
//               </Heading>

//               <div className="bg-white rounded-lg p-6 border-l-4 border-yellow-400">
//                 <Heading className="text-lg font-semibold text-gray-800 mb-3">
//                   💸 Jak získat 2 000 Kč měsíčně navíc bez práce
//                 </Heading>
//                 <Text className="text-gray-700 m-0 mb-4">
//                   Většina lidí nechává peníze "spát" na běžném účtu s úrokem 0,5%. Přitom stačí
//                   jednoduchý krok a získáte 2 000 Kč měsíčně navíc - úplně zdarma!
//                 </Text>

//                 <Link
//                   href="https://prochazka.group/tip-2000kc"
//                   className="bg-yellow-600 text-white px-6 py-3 rounded-lg font-bold inline-block hover:bg-yellow-700 transition-colors"
//                 >
//                   Zjistit jak (3 minuty čtení)
//                 </Link>
//               </div>
//             </Section>

//             {/* Social Proof */}
//             <Section className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
//               <Heading className="text-lg font-semibold text-blue-800 mb-4 text-center">
//                 ⭐ Naši čtenáři ušetřili už přes 50 MILIONŮ Kč
//               </Heading>

//               <div className="space-y-4">
//                 <div className="bg-white rounded-lg p-4 border-l-4 border-blue-400">
//                   <Text className="text-gray-700 m-0 italic">
//                     "Díky tipům z newsletteru jsem našel spoření s 5% úrokem. Za rok ušetřím 15 000 Kč!"
//                   </Text>
//                   <Text className="text-blue-600 m-0 mt-2 font-semibold">- Petr K., Praha</Text>
//                 </div>

//                 <div className="bg-white rounded-lg p-4 border-l-4 border-blue-400">
//                   <Text className="text-gray-700 m-0 italic">
//                     "Newsletter mi pomohl najít nejlepší hypotéku. Ušetřil jsem 200 000 Kč na poplatcích!"
//                   </Text>
//                   <Text className="text-blue-600 m-0 mt-2 font-semibold">- Marie N., Brno</Text>
//                 </div>
//               </div>
//             </Section>

//             {/* Preferences Display */}
//             <Section className="bg-gray-50 rounded-lg p-6 mb-8">
//               <Heading className="text-lg font-semibold text-gray-800 mb-4">
//                 📋 Vaše předvolby newsletteru
//               </Heading>

//               {preferences ? (
//                 <div className="space-y-2">
//                   {preferences.map((pref, index) => (
//                     <div key={index} className="flex items-center space-x-2">
//                       <Text className="text-green-600">✅</Text>
//                       <Text className="text-gray-700 m-0">{pref}</Text>
//                     </div>
//                   ))}
//                 </div>
//               ) : (
//                 <div className="space-y-2">
//                   <div className="flex items-center space-x-2">
//                     <Text className="text-green-600">✅</Text>
//                     <Text className="text-gray-700 m-0">Finanční tipy a strategie</Text>
//                   </div>
//                   <div className="flex items-center space-x-2">
//                     <Text className="text-green-600">✅</Text>
//                     <Text className="text-gray-700 m-0">Aktuální nabídky služeb</Text>
//                   </div>
//                   <div className="flex items-center space-x-2">
//                     <Text className="text-green-600">✅</Text>
//                     <Text className="text-gray-700 m-0">Tržní analýzy</Text>
//                   </div>
//                 </div>
//               )}

//               <div className="mt-4 pt-4 border-t border-gray-200">
//                 <Link
//                   href="https://prochazka.group/preferences"
//                   className="text-[#964BF2] hover:text-[#7c3aed] font-medium"
//                 >
//                   Upravit předvolby →
//                 </Link>
//               </div>
//             </Section>

//             {/* Strategic CTA - CONVERT TO CUSTOMER */}
//             <Section className="bg-gradient-to-r from-purple-600 to-[#964BF2] text-white rounded-xl p-8 mb-8">
//               <Heading className="text-2xl font-bold text-center text-white mb-4">
//                 🚀 Připraveni na další úroveň?
//               </Heading>

//               <Text className="text-purple-100 m-0 text-center text-lg mb-6">
//                 Newsletter je skvělý začátek, ale s osobní konzultací dosáhnete mnohem lepších výsledků.
//               </Text>

//               <div className="text-center space-y-4">
//                 <Link
//                   href="https://prochazka.group/konzultace"
//                   className="bg-white text-purple-600 px-8 py-4 rounded-lg font-bold inline-block hover:bg-gray-100 transition-colors"
//                 >
//                   📞 Získat bezplatnou konzultaci
//                 </Link>

//                 <Text className="text-purple-200 text-sm">
//                   ⚡ Prvních 50 čtenářů měsíce získá konzultaci ZDARMA (hodnota 2 500 Kč)
//                 </Text>
//               </div>
//             </Section>

//             {/* Multiple Contact Options */}
//             <Section className="text-center mb-8">
//               <Heading className="text-lg font-semibold text-gray-800 mb-4">
//                 Kontaktujte nás kdykoliv
//               </Heading>

//               <div className="space-y-3">
//                 <Row>
//                   <Column className="w-1/3 pr-1">
//                     <Link
//                       href="https://wa.me/420123456789?text=Ahoj, přihlásil jsem se k newsletteru a mám otázku."
//                       className="bg-green-600 text-white px-3 py-3 rounded-lg font-semibold inline-block hover:bg-green-700 transition-colors w-full text-center text-sm"
//                     >
//                       💬 WhatsApp
//                     </Link>
//                   </Column>
//                   <Column className="w-1/3 px-1">
//                     <Link
//                       href="tel:+420123456789"
//                       className="bg-blue-600 text-white px-3 py-3 rounded-lg font-semibold inline-block hover:bg-blue-700 transition-colors w-full text-center text-sm"
//                     >
//                       📞 Zavolat
//                     </Link>
//                   </Column>
//                   <Column className="w-1/3 pl-1">
//                     <Link
//                       href="mailto:info@prochazka.group"
//                       className="bg-gray-600 text-white px-3 py-3 rounded-lg font-semibold inline-block hover:bg-gray-700 transition-colors w-full text-center text-sm"
//                     >
//                       ✉️ Email
//                     </Link>
//                   </Column>
//                 </Row>
//               </div>
//             </Section>

//             {/* Scarcity Element */}
//             <Section className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
//               <Heading className="text-lg font-semibold text-red-800 mb-2 text-center">
//                 ⏰ Speciální nabídka pro nové čtenáře
//               </Heading>
//               <Text className="text-red-700 m-0 text-center">
//                 První 3 měsíce newsletteru zdarma + šance na bezplatnou konzultaci.
//                 Nabídka platí pouze 48 hodin od přihlášení.
//               </Text>
//             </Section>
//           </Container>

//           {/* Enhanced Footer */}
//           <Section className="bg-gray-900 text-white p-8 mt-10">
//             <div className="text-center space-y-4">
//               <div className="flex justify-center space-x-6 mb-4">
//                 <Link href="#" className="text-gray-300 hover:text-white">Facebook</Link>
//                 <Link href="#" className="text-gray-300 hover:text-white">LinkedIn</Link>
//                 <Link href="#" className="text-gray-300 hover:text-white">Instagram</Link>
//               </div>

//               <Text className="text-gray-400 text-sm mb-4">
//                 © {new Date().getFullYear()} Procházka Group. Všechna práva vyhrazena.
//               </Text>

//               <div className="flex justify-center space-x-6 text-xs text-gray-400">
//                 <Link href="#" className="hover:text-white">Ochrana soukromí</Link>
//                 <Link href="#" className="hover:text-white">Obchodní podmínky</Link>
//                 <Link href="https://prochazka.group/unsubscribe" className="hover:text-white">Odhlásit se</Link>
//               </div>
//             </div>
//           </Section>
//         </Body>
//       </Html>
//     </Tailwind>
//   )
// }

// export const newsletterUserEmail = (props) => (
//   <NewsletterUserEmailComponent {...props} />
// )

// // Export subject for use in API
// export const subject = ({ name }) => `Vítejte v newsletteru - První tip ZDARMA!`;

// // Mock data for development
// const mockNewsletterUser = {
//   name: "Jan Novák",
//   email: "jan.novak@email.cz",
//   preferences: ["Finanční tipy", "Investiční příležitosti", "Tržní analýzy"],
//   segment: "new",
//   timeContext: "morning"
// }

// // @ts-ignore
// export default () => <NewsletterUserEmailComponent {...mockNewsletterUser} />