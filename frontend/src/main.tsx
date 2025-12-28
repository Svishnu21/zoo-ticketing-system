import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

import App from '@/App'
import './index.css'
import { LanguageProvider } from '@/providers/LanguageProvider'
import { AboutPage } from '@/pages/AboutPage'
import { ContactPage } from '@/pages/ContactPage'
import { FacilitiesPage } from '@/pages/FacilitiesPage'
import { GalleryPage } from '@/pages/GalleryPage'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ParkRulesPage } from '@/pages/ParkRulesPage'
import { TariffPage } from '@/pages/TariffPage'
import { ZooPage } from '@/pages/ZooPage'
import { ZooTicketSelectionPage } from '@/pages/ZooTicketSelectionPage'
import { ParkingTicketSelectionPage } from '@/pages/ParkingTicketSelectionPage'
import { SafariTicketSelectionPage } from '@/pages/SafariTicketSelectionPage'
import { ReviewBookingPage } from '@/pages/ReviewBookingPage'
import { TermsPage } from '@/pages/TermsPage'
import { PrivacyPage } from '@/pages/PrivacyPage'
import { CancellationPage } from '@/pages/CancellationPage'
import { HowToReachPage } from '@/pages/HowToReachPage'
import { ZooAuthorityPage } from '@/pages/ZooAuthorityPage'
import { AdministrationPage } from '@/pages/AdministrationPage'
import { AnnualReportsPage } from '@/pages/AnnualReportsPage'
import { OtherPublicationsPage } from '@/pages/OtherPublicationsPage'
import { TendersPage } from '@/pages/TendersPage'
import { AdoptionPage } from '@/pages/AdoptionPage'
import { ChooseAdoptionPage } from '@/pages/ChooseAdoptionPage'
import { ChooseAdoptionByPricePage } from '@/pages/ChooseAdoptionByPricePage'
import { AnimalInfoPage } from '@/pages/AnimalInfoPage'
import { ZooSchoolPage } from '@/pages/ZooSchoolPage'
import { UpcomingEventsPage } from '@/pages/UpcomingEventsPage'
import { ZooEducationPage } from '@/pages/ZooEducationPage'
import { WhatsNewPage } from '@/pages/WhatsNewPage'
import { LatestActivitiesPage } from '@/pages/LatestActivitiesPage'
import { AnimalVetCarePage } from '@/pages/AnimalVetCarePage'
import { AdoptionSchemePage } from '@/pages/AdoptionSchemePage'
import { FooterZooEducationPage } from '@/pages/FooterZooEducationPage'
import { FooterPublicationPage } from '@/pages/FooterPublicationPage'
import { PartnerWithUsPage } from '@/pages/PartnerWithUsPage'
import { CSRActivityPage } from '@/pages/CSRActivityPage'
import { OthersPage } from '@/pages/OthersPage'
import { ZooChartPage } from '@/pages/ZooChartPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />}>
            <Route index element={<HomePage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="about/how-to-reach" element={<HowToReachPage />} />
            <Route path="about/zoo-authority" element={<ZooAuthorityPage />} />
            <Route path="about/administration" element={<AdministrationPage />} />
            <Route path="about/annual-report" element={<AnnualReportsPage />} />
            <Route path="about/publications" element={<OtherPublicationsPage />} />
            {/* Visitor Information page removed */}
            <Route path="tenders" element={<TendersPage />} />
            <Route path="adoption" element={<AdoptionPage />} />
            <Route path="adoption/choose" element={<ChooseAdoptionPage />} />
            <Route path="adoption/choose-by-price" element={<ChooseAdoptionByPricePage />} />
            <Route path="partner-with-us" element={<PartnerWithUsPage />} />
            <Route path="partner-with-us/csr-activity" element={<CSRActivityPage />} />
            <Route path="zoo" element={<ZooPage />} />
            <Route path="animal-info" element={<AnimalInfoPage />} />
            <Route path="whats-new" element={<WhatsNewPage />} />
            <Route path="whats-new/latest-activities" element={<LatestActivitiesPage />} />
            <Route path="zoo-school" element={<ZooSchoolPage />} />
            <Route path="zoo-school/upcoming-events" element={<UpcomingEventsPage />} />
            <Route path="zoo-school/education" element={<ZooEducationPage />} />
            <Route path="support/animal-vet-care" element={<AnimalVetCarePage />} />
            <Route path="support/adoption-scheme" element={<AdoptionSchemePage />} />
            <Route path="support/zoo-education" element={<FooterZooEducationPage />} />
            <Route path="support/publication" element={<FooterPublicationPage />} />
            <Route path="facilities" element={<FacilitiesPage />} />
            <Route path="tariff" element={<TariffPage />} />
            <Route path="tickets/zoo" element={<ZooTicketSelectionPage />} />
            <Route path="tickets/parking" element={<ParkingTicketSelectionPage />} />
            <Route path="tickets/safari" element={<SafariTicketSelectionPage />} />
            <Route path="tickets/review" element={<ReviewBookingPage />} />
            <Route path="rules" element={<ParkRulesPage />} />
            <Route path="terms" element={<TermsPage />} />
            <Route path="privacy" element={<PrivacyPage />} />
            <Route path="cancellation" element={<CancellationPage />} />
            <Route path="gallery" element={<GalleryPage />} />
            <Route path="others" element={<OthersPage />} />
            <Route path="others/zoo-chart" element={<ZooChartPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  </StrictMode>,
)
