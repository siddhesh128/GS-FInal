import Link from "next/link"
import { redirect } from "next/navigation"
import { BookOpen, Calendar, CheckCircle, GraduationCap, Users } from "lucide-react"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { Button } from "@/components/ui/button"
import { getSession } from "@/lib/auth"

export default async function Home() {
  const session = await getSession()

  if (session) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <header className="relative bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        {/* ThemeSwitcher container */}
        <div className="absolute top-4 right-4 z-20">
          <ThemeSwitcher />
        </div>
        <div className="container relative z-10 mx-auto flex flex-col items-center px-4 py-16 text-center md:py-32">
          <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-6xl">Examination Management System</h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-primary-foreground/80 md:text-xl">
            A comprehensive platform for managing examinations with dedicated portals for students, faculty, and
            administrators.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link href="/login">
              <Button size="lg" variant="secondary" className="min-w-[150px]">
                Login
              </Button>
            </Link>
            <Link href="/register">
              <Button
                size="lg"
                variant="outline"
                className="min-w-[150px] bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              >
                Register
              </Button>
            </Link>
          </div>
        </div>
      </header>
      {/* Features Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="mb-4 text-center text-3xl font-bold md:text-4xl">Key Features</h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
            Our platform offers a comprehensive set of features designed to streamline the examination process for all
            stakeholders.
          </p>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="group rounded-lg border bg-card p-6 shadow-sm transition-all hover:shadow-md">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <GraduationCap className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Student Portal</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  Exam enrollment
                </li>
                <li className="flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  View seating arrangements
                </li>
                <li className="flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  Download hall tickets
                </li>
                <li className="flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  Check exam results
                </li>
              </ul>
            </div>

            <div className="group rounded-lg border bg-card p-6 shadow-sm transition-all hover:shadow-md">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Faculty Portal</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  View invigilation duties
                </li>
                <li className="flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  Access examination hall details
                </li>
                <li className="flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  Manage assigned exams
                </li>
                <li className="flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  Report exam incidents
                </li>
              </ul>
            </div>

            <div className="group rounded-lg border bg-card p-6 shadow-sm transition-all hover:shadow-md">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Calendar className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Admin Portal</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  User management
                </li>
                <li className="flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  Exam scheduling
                </li>
                <li className="flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  Seating arrangement generation
                </li>
                <li className="flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  Comprehensive reporting
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-muted py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="mb-4 text-center text-3xl font-bold md:text-4xl">How It Works</h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
            Our platform simplifies the examination process from start to finish
          </p>

          <div className="grid gap-8 md:grid-cols-4">
            <div className="relative flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <span className="text-xl font-bold">1</span>
              </div>
              <h3 className="mb-2 text-lg font-semibold">Exam Creation</h3>
              <p className="text-muted-foreground">Admins create exams with all necessary details</p>

              {/* Connector line */}
              <div className="absolute right-0 top-8 hidden h-0.5 w-full -translate-y-1/2 bg-primary/30 md:block md:w-1/2"></div>
            </div>

            <div className="relative flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <span className="text-xl font-bold">2</span>
              </div>
              <h3 className="mb-2 text-lg font-semibold">Student Enrollment</h3>
              <p className="text-muted-foreground">Students enroll in their respective exams</p>

              {/* Connector lines */}
              <div className="absolute left-0 top-8 hidden h-0.5 w-1/2 -translate-y-1/2 bg-primary/30 md:block"></div>
              <div className="absolute right-0 top-8 hidden h-0.5 w-1/2 -translate-y-1/2 bg-primary/30 md:block"></div>
            </div>

            <div className="relative flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <span className="text-xl font-bold">3</span>
              </div>
              <h3 className="mb-2 text-lg font-semibold">Seating Arrangement</h3>
              <p className="text-muted-foreground">System generates optimal seating arrangements</p>

              {/* Connector lines */}
              <div className="absolute left-0 top-8 hidden h-0.5 w-1/2 -translate-y-1/2 bg-primary/30 md:block"></div>
              <div className="absolute right-0 top-8 hidden h-0.5 w-1/2 -translate-y-1/2 bg-primary/30 md:block"></div>
            </div>

            <div className="relative flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <span className="text-xl font-bold">4</span>
              </div>
              <h3 className="mb-2 text-lg font-semibold">Hall Ticket Generation</h3>
              <p className="text-muted-foreground">Students download their hall tickets</p>

              {/* Connector line */}
              <div className="absolute left-0 top-8 hidden h-0.5 w-1/2 -translate-y-1/2 bg-primary/30 md:block"></div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary/5 py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">Ready to Get Started?</h2>
          <p className="mx-auto mb-8 max-w-2xl text-muted-foreground">
            Join our platform today and experience a streamlined examination management process
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/register">
              <Button size="lg" className="min-w-[200px]">
                Register Now
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="min-w-[200px]">
                Login
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center">
              <BookOpen className="mr-2 h-6 w-6 text-primary" />
              <span className="text-lg font-bold">Exam Management Systems</span>
            </div>
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Examination Management System. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
