import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { ScrollToTop } from '@/components/layout/ScrollToTop'

function App() {
  const location = useLocation()
  const isBookingPage = location.pathname.startsWith('/tickets/')

  useEffect(() => {
    document.body.style.overflowY = 'auto'
    document.body.style.touchAction = 'auto'

    return () => {
      document.body.style.overflowY = 'auto'
      document.body.style.touchAction = 'auto'
    }
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <ScrollToTop />
      <main className={isBookingPage ? 'pb-0' : 'pb-20'}>
        <Outlet />
      </main>
      {!isBookingPage && <Footer />}
    </div>
  )
}

export default App
