import React from 'react'
import BaseLayout from '@/components/BaseLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { 
  Calculator, 
  Shield, 
  Clock, 
  Wrench, 
  TrendingUp, 
  CreditCard, 
  Car, 
  CheckCircle 
} from 'lucide-react'

const WhyPrivateLeasing: React.FC = () => {
  const benefits = [
    {
      icon: <Calculator className="h-8 w-8 text-primary" />,
      title: "Forudsigelige månedlige udgifter",
      description: "Med privatleasing ved du præcis, hvad din bil koster hver måned. Ingen uventede reparationsregninger eller værditab."
    },
    {
      icon: <Shield className="h-8 w-8 text-primary" />,
      title: "Omfattende forsikring inkluderet",
      description: "Kaskoforsikring og vejhjælp er ofte inkluderet, så du er beskyttet mod uforudsete hændelser."
    },
    {
      icon: <Clock className="h-8 w-8 text-primary" />,
      title: "Altid en ny bil",
      description: "Bytt til en ny bil hvert 2-4 år og nyd altid de nyeste funktioner og teknologier."
    },
    {
      icon: <Wrench className="h-8 w-8 text-primary" />,
      title: "Service og vedligeholdelse",
      description: "Service, dæk og vedligeholdelse er ofte inkluderet i den månedlige ydelse."
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-primary" />,
      title: "Beskyttelse mod værditab",
      description: "Du slipper for bekymringer om bilens værditab og restværdi ved salg."
    },
    {
      icon: <CreditCard className="h-8 w-8 text-primary" />,
      title: "Lav eller ingen udbetaling",
      description: "Kom i gang med din drømmebil med minimal startinvestering."
    }
  ]

  const includedServices = [
    "Kaskoforsikring",
    "Vejhjælp 24/7",
    "Service og reparationer",
    "Sommer- og vinterdæk",
    "Periodisk syn",
    "Motor- og vejregistrering",
    "Grøn ejerafgift"
  ]

  return (
    <BaseLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary via-primary to-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-black/20 to-black/40"></div>
        <div className="mx-auto w-full max-w-[1440px] px-6 md:px-12 py-16 md:py-24 relative z-10">
          <div className="text-center space-y-6 max-w-4xl mx-auto">
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              Privatleasing guide
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
              Hvorfor vælge privatleasing?
            </h1>
            <p className="text-xl text-white/85 leading-relaxed max-w-2xl mx-auto">
              Privatleasing giver dig frihed til at køre en ny bil uden de økonomiske bekymringer ved køb. 
              Oplev fordelene ved en forudsigelig bilpakke.
            </p>
            <Link to="/listings">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold">
                <Car className="mr-2 h-5 w-5" />
                Find din næste bil
              </Button>
            </Link>
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
                Fordelene ved privatleasing
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Privatleasing tilbyder mange fordele sammenlignet med traditionelt bilkøb. 
                Her er de vigtigste grunde til at vælge leasing.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {benefits.map((benefit, index) => (
                <Card key={index} className="border border-border transition-all">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        {benefit.icon}
                        <h3 className="text-lg font-semibold text-foreground">
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

        {/* What's Included Section */}
        <section className="bg-muted/30">
          <div className="mx-auto w-full max-w-[1440px] px-6 md:px-12 py-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div>
                  <Badge variant="outline" className="mb-4">
                    Alt inkluderet
                  </Badge>
                  <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                    Hvad er inkluderet i privatleasing?
                  </h2>
                  <p className="text-lg text-muted-foreground">
                    Med privatleasing får du en komplet bilpakke, hvor de fleste udgifter er dækket. 
                    Det gør det nemt at budgettere og planlægge din økonomi.
                  </p>
                </div>

                <div className="space-y-3">
                  {includedServices.map((service, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                      <span className="text-foreground font-medium">{service}</span>
                    </div>
                  ))}
                </div>

                <Link to="/listings">
                  <Button size="lg" className="font-semibold">
                    Se tilgængelige biler
                  </Button>
                </Link>
              </div>

              <Card className="border border-border">
                <CardHeader>
                  <CardTitle className="text-center text-primary">
                    Eksempel: Månedlig ydelse
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-foreground mb-2">
                      2.499 kr/md
                    </div>
                    <p className="text-muted-foreground">
                      Volkswagen Golf 1.5 TSI
                    </p>
                  </div>
                  
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Løbetid:</span>
                      <span className="font-medium">36 måneder</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Km/år:</span>
                      <span className="font-medium">20.000 km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Udbetaling:</span>
                      <span className="font-medium">0 kr</span>
                    </div>
                  </div>

                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm text-center text-muted-foreground">
                      Inkl. forsikring, service, dæk og vejhjælp
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-background">
          <div className="mx-auto w-full max-w-[1440px] px-6 md:px-12">
            <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="p-8 md:p-12 text-center">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Klar til at finde din næste bil?
                </h2>
                <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Udforsk vores store udvalg af leasingbiler og find den perfekte bil til dine behov. 
                  Sammenlign priser og vilkår fra forskellige forhandlere.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/listings">
                    <Button size="lg" className="font-semibold w-full sm:w-auto">
                      <Car className="mr-2 h-5 w-5" />
                      Browse alle biler
                    </Button>
                  </Link>
                  <Link to="/about">
                    <Button variant="outline" size="lg" className="font-semibold w-full sm:w-auto">
                      Læs mere om os
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

      </div>
    </BaseLayout>
  )
}

export default WhyPrivateLeasing