import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/Button'

export function NotFoundPage() {
  return (
    <section className="page-enter py-24">
      <div className="container text-center">
  <h1 className="text-6xl font-bold text-forest-green">404</h1>
        <p className="mt-4 text-lg text-muted-foreground">The page you are looking for could not be found.</p>
        <Button asChild className="mt-8">
          <Link to="/">Back to Home</Link>
        </Button>
      </div>
    </section>
  )
}
