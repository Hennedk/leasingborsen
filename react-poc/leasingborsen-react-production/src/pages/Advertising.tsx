import React from 'react'
import BaseLayout from '@/components/BaseLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Target, 
  Users, 
  TrendingUp, 
  BarChart3, 
  Mail, 
  Phone,
  CheckCircle,
  Megaphone,
  Eye,
  MousePointer
} from 'lucide-react'

const Advertising: React.FC = () => {
  const benefits = [
    {
      icon: <Target className="h-8 w-8 text-primary" />,
      title: "Målrettet målgruppe",
      description: "Nå direkte ud til potentielle leasingkunder, der aktivt søger efter deres næste bil."
    },
    {
      icon: <Users className="h-8 w-8 text-primary" />,
      title: "Høj trafikvolumen",
      description: "Tusindvis af besøgende hver måned, der sammenligner leasingtilbud og priser."
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-primary" />,
      title: "Øget synlighed",
      description: "Placér jeres brand og tilbud, hvor kunderne er mest aktive i deres købsproces."
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-primary" />,
      title: "Målbare resultater",
      description: "Detaljeret rapportering og analytics til at måle jeres marketinginvestering."
    }
  ]

  const packages = [
    {
      name: "Basis",
      price: "5.000",
      period: "per måned",
      description: "Perfekt til mindre forhandlere",
      features: [
        "Op til 10 bilannoncer",
        "Grundlæggende synlighed",
        "E-mail support",
        "Månedlig rapport"
      ],
      popular: false
    },
    {
      name: "Professional",
      price: "12.000",
      period: "per måned",
      description: "Vores mest populære pakke",
      features: [
        "Op til 50 bilannoncer",
        "Premium placering",
        "Prioriteret support",
        "Detaljeret analytics",
        "Logo på forsiden",
        "Social media deling"
      ],
      popular: true
    },
    {
      name: "Enterprise",
      price: "Kontakt os",
      period: "for pris",
      description: "Tilpasset løsning til store forhandlere",
      features: [
        "Ubegrænset antal annoncer",
        "Dedikeret account manager",
        "Brandet subdomæne",
        "API integration",
        "Custom rapportering",
        "24/7 support"
      ],
      popular: false
    }
  ]

  const stats = [
    { number: "25.000+", label: "Månedlige besøgende" },
    { number: "500+", label: "Aktive annoncer" },
    { number: "50+", label: "Partnere" },
    { number: "98%", label: "Kundetilfredshed" }
  ]

  return (
    <BaseLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary via-primary to-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-black/20 to-black/40"></div>
        <div className="mx-auto w-full max-w-[1440px] px-6 md:px-12 py-16 md:py-24 relative z-10">
          <div className="text-center space-y-6 max-w-4xl mx-auto">
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              Markedsføring
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
              Annoncér på Leasingbørsen
            </h1>
            <p className="text-xl text-white/85 leading-relaxed max-w-2xl mx-auto">
              Nå tusindvis af potentielle kunder, der aktivt søger efter leasingbiler. 
              Boost jeres synlighed og øg salget med vores målrettede marketingløsninger.
            </p>
            <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold">
              <Mail className="mr-2 h-5 w-5" />
              Kontakt os i dag
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-muted/30 py-16">
        <div className="mx-auto w-full max-w-[1440px] px-6 md:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                  {stat.number}
                </div>
                <div className="text-muted-foreground font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="space-y-16 py-16">
        
        {/* Benefits Section */}
        <section className="bg-background">
          <div className="mx-auto w-full max-w-[1440px] px-6 md:px-12">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Hvorfor annoncere hos os?
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Leasingbørsen er Danmarks førende platform for billeasing. 
                Vi forbinder forhandlere med kvalificerede kunder.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {benefits.map((benefit, index) => (
                <Card key={index} className="border border-border hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        {benefit.icon}
                        <h3 className="text-xl font-semibold text-foreground">
                          {benefit.title}
                        </h3>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">
                        {benefit.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="bg-muted/30">
          <div className="mx-auto w-full max-w-[1440px] px-6 md:px-12 py-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Vælg den rette pakke
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Vi tilbyder fleksible løsninger, der passer til forhandlere af alle størrelser.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {packages.map((pkg, index) => (
                <Card 
                  key={index} 
                  className={`border relative ${
                    pkg.popular 
                      ? 'border-primary ring-2 ring-primary/20 shadow-lg' 
                      : 'border-border'
                  }`}
                >
                  {pkg.popular && (
                    <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary">
                      Mest populær
                    </Badge>
                  )}
                  
                  <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold text-foreground mb-2">
                      {pkg.name}
                    </CardTitle>
                    <div className="space-y-1">
                      <div className="text-3xl font-bold text-primary">
                        {pkg.price} {pkg.price !== "Kontakt os" && "kr"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {pkg.period}
                      </div>
                    </div>
                    <p className="text-muted-foreground">
                      {pkg.description}
                    </p>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      {pkg.features.map((feature, featureIndex) => (
                        <div key={featureIndex} className="flex items-center space-x-3">
                          <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                          <span className="text-foreground">{feature}</span>
                        </div>
                      ))}
                    </div>
                    
                    <Button 
                      className={`w-full font-semibold ${
                        pkg.popular 
                          ? 'bg-primary hover:bg-primary/90' 
                          : 'bg-secondary hover:bg-secondary/90'
                      }`}
                      size="lg"
                    >
                      {pkg.price === "Kontakt os" ? "Kontakt salg" : "Kom i gang"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="bg-background">
          <div className="mx-auto w-full max-w-[1440px] px-6 md:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              
              <div className="space-y-6">
                <div>
                  <Badge variant="outline" className="mb-4">
                    <Megaphone className="mr-2 h-4 w-4" />
                    Kontakt
                  </Badge>
                  <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                    Klar til at komme i gang?
                  </h2>
                  <p className="text-lg text-muted-foreground">
                    Vores salesteam er klar til at hjælpe jer med at finde den perfekte markedsføringsløsning. 
                    Kontakt os i dag for en uforpligtende samtale.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">E-mail</div>
                      <div className="text-muted-foreground">salg@leasingborsen.dk</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">Telefon</div>
                      <div className="text-muted-foreground">70 20 30 40</div>
                    </div>
                  </div>
                </div>
              </div>

              <Card className="border border-border shadow-lg">
                <CardHeader>
                  <CardTitle className="text-center text-primary flex items-center justify-center">
                    <Eye className="mr-2 h-5 w-5" />
                    Performance eksempel
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center">
                    <div className="text-lg text-muted-foreground mb-4">
                      Gennemsnitlige månedsresultater
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <Eye className="h-4 w-4 text-primary" />
                        <span className="text-foreground">Visninger</span>
                      </div>
                      <span className="font-bold text-foreground">12.500</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <MousePointer className="h-4 w-4 text-primary" />
                        <span className="text-foreground">Klik</span>
                      </div>
                      <span className="font-bold text-foreground">850</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        <span className="text-foreground">CTR</span>
                      </div>
                      <span className="font-bold text-primary">6.8%</span>
                    </div>
                  </div>

                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm text-center text-muted-foreground">
                      Baseret på Professional pakke data
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

      </div>
    </BaseLayout>
  )
}

export default Advertising