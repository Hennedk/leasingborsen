import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Info, 
  Car, 
  Fuel, 
  Calendar, 
  MapPin, 
  Star,
  Zap,
  Settings,
  DollarSign,
  Plus,
  Search
} from 'lucide-react';

const ComponentSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-12">
    <h2 className="text-2xl font-bold mb-6 pb-2 border-b">{title}</h2>
    <div className="space-y-4">
      {children}
    </div>
  </div>
);

const ComponentDemo = ({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) => (
  <div className="mb-8">
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    {description && <p className="text-sm text-gray-600 mb-4">{description}</p>}
    <div className="p-6 bg-gray-50 rounded-lg border">
      {children}
    </div>
  </div>
);

// Utility functions for Danish formatting
const formatPrice = (price: number) => `${price.toLocaleString('da-DK')} kr/måned`;
const formatMileage = (mileage: number) => `${mileage.toLocaleString('da-DK')} km/år`;
const formatYear = (year: number) => `${year}`;

export default function DesignSystemShowcase() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [selectedFuelType, setSelectedFuelType] = useState('benzin');
  const [makeModalOpen, setMakeModalOpen] = useState(false);
  const [modelModalOpen, setModelModalOpen] = useState(false);
  const [selectedMakes, setSelectedMakes] = useState<string[]>(['BMW', 'Audi']);
  const [selectedModels, setSelectedModels] = useState<string[]>(['X3', 'A4']);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-8 max-w-6xl">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">Leasingbørsen Design System</h1>
          <p className="text-lg text-muted-foreground">
            Centraliseret designsystem for Danmarks billeasing platform med shadcn/ui komponenter
          </p>
          <div className="mt-4 flex gap-2">
            <Badge variant="outline">React 19</Badge>
            <Badge variant="outline">TypeScript</Badge>
            <Badge variant="outline">shadcn/ui</Badge>
            <Badge variant="outline">Tailwind CSS 4</Badge>
            <Badge variant="outline">Poppins Font</Badge>
            <Badge variant="outline">OKLCH Colors</Badge>
            <Badge variant="outline">No Shadows</Badge>
          </div>
        </div>

        {/* Typography Section */}
        <ComponentSection title="Typography">
          <ComponentDemo title="Headings">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold">Heading 1</h1>
              <h2 className="text-3xl font-bold">Heading 2</h2>
              <h3 className="text-2xl font-bold">Heading 3</h3>
              <h4 className="text-xl font-bold">Heading 4</h4>
              <h5 className="text-lg font-bold">Heading 5</h5>
              <h6 className="text-base font-bold">Heading 6</h6>
            </div>
          </ComponentDemo>
          
          <ComponentDemo title="Text Styles">
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Small muted text</p>
              <p>Regular paragraph text with normal weight</p>
              <p className="font-semibold">Semibold text for emphasis</p>
              <p className="font-bold">Bold text for strong emphasis</p>
              <p className="italic">Italic text for alternative voice</p>
              <p className="underline">Underlined text for links</p>
            </div>
          </ComponentDemo>
        </ComponentSection>

        {/* Buttons Section */}
        <ComponentSection title="Knapper">
          <ComponentDemo title="Knap varianter" description="Forskellige knap stile til forskellige anvendelser">
            <div className="flex flex-wrap gap-4">
              <Button>Se tilbud</Button>
              <Button variant="secondary">Sammenlign</Button>
              <Button variant="destructive">Slet søgning</Button>
              <Button variant="outline">Gem favorit</Button>
              <Button variant="ghost">Detaljer</Button>
              <Button variant="link">Læs anmeldelse</Button>
            </div>
          </ComponentDemo>
          
          <ComponentDemo title="Knap størrelser" description="Størrelser til forskellige kontekster">
            <div className="flex flex-wrap items-center gap-4">
              <Button size="sm">Filtrer</Button>
              <Button size="default">Book prøvetur</Button>
              <Button size="lg">Få tilbud nu</Button>
            </div>
          </ComponentDemo>
          
          <ComponentDemo title="Knap tilstande" description="Normale og deaktiverede tilstande">
            <div className="flex flex-wrap gap-4">
              <Button>Kontakt forhandler</Button>
              <Button disabled>Ikke tilgængelig</Button>
            </div>
          </ComponentDemo>

          <ComponentDemo title="Kontekstuelle knapper" description="Knapper med ikoner til billeasing">
            <div className="flex flex-wrap gap-4">
              <Button>
                <Car className="mr-2 h-4 w-4" />
                Se bil detaljer
              </Button>
              <Button variant="secondary">
                <DollarSign className="mr-2 h-4 w-4" />
                Beregn månedspris
              </Button>
              <Button variant="outline">
                <Star className="mr-2 h-4 w-4" />
                Tilføj til favoritter
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="mr-2 h-4 w-4" />
                Konfigurer
              </Button>
            </div>
          </ComponentDemo>
        </ComponentSection>

        {/* Form Controls Section */}
        <ComponentSection title="Formular Kontrolelementer">
          <ComponentDemo title="Søgefelter" description="Input felter til bil søgning">
            <div className="space-y-4 max-w-md">
              <div>
                <Label htmlFor="search-input">Søg efter bilmærke eller model</Label>
                <Input id="search-input" placeholder="f.eks. BMW X3, Tesla Model Y..." />
              </div>
              <div>
                <Label htmlFor="disabled-input">Ikke tilgængelig søgning</Label>
                <Input id="disabled-input" placeholder="Denne funktion er deaktiveret" disabled />
              </div>
              <div>
                <Label htmlFor="email-input">Email til tilbud</Label>
                <Input id="email-input" type="email" placeholder="din@email.dk" />
              </div>
              <div>
                <Label htmlFor="phone-input">Telefonnummer</Label>
                <Input id="phone-input" type="tel" placeholder="+45 12 34 56 78" />
              </div>
            </div>
          </ComponentDemo>

          <ComponentDemo title="Besked felt" description="Til kontakt med forhandlere">
            <div className="max-w-md">
              <Label htmlFor="message">Besked til forhandler</Label>
              <Textarea 
                id="message" 
                placeholder="Hej, jeg er interesseret i denne bil og vil gerne høre mere om leasingmulighederne..." 
                rows={4} 
              />
            </div>
          </ComponentDemo>

          <ComponentDemo title="Modal-Based Selectors (Actual Implementation)" description="De faktiske vælger komponenter brugt på /listings siden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Make Selector - Modal Pattern */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">Mærke</Label>
                <Dialog open={makeModalOpen} onOpenChange={setMakeModalOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between border text-xs font-normal"
                      size="sm"
                    >
                      {selectedMakes.length > 0 
                        ? `${selectedMakes.length} ${selectedMakes.length === 1 ? 'mærke' : 'mærker'} valgt`
                        : 'Vælg mærker'
                      }
                      <Plus className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Vælg bilmærker</DialogTitle>
                      <DialogDescription>
                        Vælg et eller flere bilmærker for at filtrere søgeresultaterne.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div className="relative">
                        <Input
                          placeholder="Søg mærker..."
                          className="pl-10"
                        />
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                      </div>
                      
                      <ScrollArea className="h-80">
                        <div className="space-y-4">
                          {/* Popular Makes */}
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-muted-foreground">Populære mærker</h4>
                            <div className="space-y-2">
                              {['BMW', 'Audi', 'Mercedes-Benz', 'Volkswagen'].map((make) => (
                                <div key={make} className="flex items-center space-x-2">
                                  <Checkbox
                                    checked={selectedMakes.includes(make)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedMakes([...selectedMakes, make])
                                      } else {
                                        setSelectedMakes(selectedMakes.filter(m => m !== make))
                                      }
                                    }}
                                  />
                                  <Label className="text-sm font-normal cursor-pointer">
                                    {make}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <Separator />
                          
                          {/* Other Makes */}
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-muted-foreground">Andre mærker</h4>
                            <div className="space-y-2">
                              {['Tesla', 'Volvo', 'Toyota', 'Ford'].map((make) => (
                                <div key={make} className="flex items-center space-x-2">
                                  <Checkbox
                                    checked={selectedMakes.includes(make)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedMakes([...selectedMakes, make])
                                      } else {
                                        setSelectedMakes(selectedMakes.filter(m => m !== make))
                                      }
                                    }}
                                  />
                                  <Label className="text-sm font-normal cursor-pointer">
                                    {make}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </ScrollArea>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Model Selector - Modal Pattern */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">Model</Label>
                <Dialog open={modelModalOpen} onOpenChange={setModelModalOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between border text-xs font-normal"
                      size="sm"
                    >
                      {selectedModels.length > 0 
                        ? `${selectedModels.length} ${selectedModels.length === 1 ? 'model' : 'modeller'} valgt`
                        : 'Vælg modeller'
                      }
                      <Plus className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Vælg bilmodeller</DialogTitle>
                      <DialogDescription>
                        Vælg specifikke modeller baseret på dine valgte mærker.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div className="relative">
                        <Input
                          placeholder="Søg modeller..."
                          className="pl-10"
                        />
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                      </div>
                      
                      <ScrollArea className="h-80">
                        <div className="space-y-4">
                          {/* BMW Models */}
                          {selectedMakes.includes('BMW') && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-muted-foreground">BMW</h4>
                              <div className="space-y-2">
                                {['X3', 'X5', '3-serie', '5-serie'].map((model) => (
                                  <div key={model} className="flex items-center space-x-2">
                                    <Checkbox
                                      checked={selectedModels.includes(model)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setSelectedModels([...selectedModels, model])
                                        } else {
                                          setSelectedModels(selectedModels.filter(m => m !== model))
                                        }
                                      }}
                                    />
                                    <Label className="text-sm font-normal cursor-pointer">
                                      {model}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Audi Models */}
                          {selectedMakes.includes('Audi') && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-muted-foreground">Audi</h4>
                              <div className="space-y-2">
                                {['A4', 'A6', 'Q3', 'Q5'].map((model) => (
                                  <div key={model} className="flex items-center space-x-2">
                                    <Checkbox
                                      checked={selectedModels.includes(model)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setSelectedModels([...selectedModels, model])
                                        } else {
                                          setSelectedModels(selectedModels.filter(m => m !== model))
                                        }
                                      }}
                                    />
                                    <Label className="text-sm font-normal cursor-pointer">
                                      {model}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Traditional Select for comparison */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Sortering (traditionel dropdown)</Label>
                <Select defaultValue="price-asc">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="price-asc">Pris (lav til høj)</SelectItem>
                    <SelectItem value="price-desc">Pris (høj til lav)</SelectItem>
                    <SelectItem value="year-desc">Nyeste først</SelectItem>
                    <SelectItem value="lease-score">Bedste LeaseScore</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Bruges kun til simple single-select optioner
                </p>
              </div>

              {/* Fuel Type Select */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Brændstof (dropdown)</Label>
                <Select value={selectedFuelType} onValueChange={setSelectedFuelType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vælg brændstof" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="benzin">
                      <div className="flex items-center gap-2">
                        <Fuel className="h-4 w-4" />
                        Benzin
                      </div>
                    </SelectItem>
                    <SelectItem value="diesel">
                      <div className="flex items-center gap-2">
                        <Fuel className="h-4 w-4" />
                        Diesel
                      </div>
                    </SelectItem>
                    <SelectItem value="hybrid">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Hybrid
                      </div>
                    </SelectItem>
                    <SelectItem value="electric">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Elektrisk
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

            </div>
          </ComponentDemo>

          <ComponentDemo title="Avancerede Selector Mønstre" description="Specielle vælger komponenter og tilstande">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Multi-select simulation */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Ønskede Funktioner (Multi-select simulation)</Label>
                <div className="space-y-2">
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Vælg funktioner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gps">GPS Navigation</SelectItem>
                      <SelectItem value="leather">Læder interiør</SelectItem>
                      <SelectItem value="sunroof">Soltag</SelectItem>
                      <SelectItem value="parking">Parkeringshjælp</SelectItem>
                      <SelectItem value="heated">Opvarmede sæder</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-xs">
                      GPS Navigation ×
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      Læder interiør ×
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Loading State */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Indlæser tilstand</Label>
                <Select disabled>
                  <SelectTrigger>
                    <SelectValue placeholder="Indlæser modeller..." />
                  </SelectTrigger>
                </Select>
                <p className="text-xs text-muted-foreground">Vises mens data hentes fra API</p>
              </div>

              {/* Error State */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-destructive">Fejltilstand</Label>
                <Select>
                  <SelectTrigger className="border-destructive">
                    <SelectValue placeholder="Kunne ikke indlæse data" />
                  </SelectTrigger>
                </Select>
                <p className="text-xs text-destructive">Der opstod en fejl ved indlæsning af bilmærker</p>
              </div>

              {/* Search-like Select */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Søgbar vælger</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Søg eller vælg forhandler..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bmw-cph">BMW København</SelectItem>
                    <SelectItem value="bmw-aarhus">BMW Aarhus</SelectItem>
                    <SelectItem value="audi-cph">Audi København</SelectItem>
                    <SelectItem value="audi-odense">Audi Odense</SelectItem>
                    <SelectItem value="mercedes-cph">Mercedes-Benz København</SelectItem>
                    <SelectItem value="volvo-aalborg">Volvo Aalborg</SelectItem>
                  </SelectContent>
                </Select>
              </div>

            </div>
          </ComponentDemo>

          <ComponentDemo title="Selector Design Tokens & Patterns" description="To forskellige vælger mønstre i systemet">
            <div className="space-y-6">
              
              {/* Modal vs Dropdown Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Modal Pattern */}
                <div className="space-y-3 p-4 border border-primary/20 rounded-lg">
                  <h4 className="text-sm font-semibold text-primary">Modal-baseret (multi-select)</h4>
                  <Button
                    variant="outline"
                    className="w-full justify-between border text-xs font-normal"
                    size="sm"
                  >
                    2 mærker valgt
                    <Plus className="w-4 h-4" />
                  </Button>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div><strong>Bruges til:</strong> Mærker, modeller, funktioner</div>
                    <div><strong>Styrker:</strong> Multi-select, søgning, kategorier</div>
                    <div><strong>Pattern:</strong> Dialog + Checkbox lists</div>
                    <div><strong>Størrelse:</strong> size="sm" (kompakt)</div>
                  </div>
                </div>

                {/* Dropdown Pattern */}
                <div className="space-y-3 p-4 border border-secondary/40 rounded-lg">
                  <h4 className="text-sm font-semibold text-secondary-foreground">Dropdown (single-select)</h4>
                  <Select defaultValue="price-asc">
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="price-asc">Pris (lav til høj)</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div><strong>Bruges til:</strong> Sortering, brændstof, årgang</div>
                    <div><strong>Styrker:</strong> Simpel, hurtig, kendt pattern</div>
                    <div><strong>Pattern:</strong> Native Select komponenter</div>
                    <div><strong>Størrelse:</strong> Standard højde</div>
                  </div>
                </div>

              </div>

              {/* Usage Guidelines */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm font-medium mb-2">Anvendelsesguide:</div>
                <div className="text-xs text-muted-foreground space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="font-semibold text-primary mb-1">Brug Modal Pattern når:</div>
                      <ul className="space-y-1 ml-2">
                        <li>• Multi-select er nødvendig</li>
                        <li>• Mange valgmuligheder (&gt;8)</li>
                        <li>• Søgefunktionalitet behøves</li>
                        <li>• Kategorisering er nyttig</li>
                      </ul>
                    </div>
                    <div>
                      <div className="font-semibold text-secondary-foreground mb-1">Brug Dropdown når:</div>
                      <ul className="space-y-1 ml-2">
                        <li>• Single-select er tilstrækkelig</li>
                        <li>• Få valgmuligheder (&lt;8)</li>
                        <li>• Hurtig navigation ønskes</li>
                        <li>• Simpel funktionalitet</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Implementation Details */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm font-medium mb-2 text-blue-800">Implementeringsdetaljer:</div>
                <div className="text-xs text-blue-700 space-y-1">
                  <div><strong>Modal komponenter:</strong> Dialog, DialogTrigger, DialogContent, ScrollArea</div>
                  <div><strong>Button styling:</strong> variant="outline", size="sm", text-xs font-normal</div>
                  <div><strong>Search pattern:</strong> Input med search icon + debounced søgning</div>
                  <div><strong>Count display:</strong> "X mærker valgt" med korrekt flertal</div>
                  <div><strong>Kategorier:</strong> "Populære" vs "Andre" med Separator</div>
                </div>
              </div>

            </div>
          </ComponentDemo>

          <ComponentDemo title="Leasing optioner" description="Checkboxes til leasing præferencer">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="terms" 
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                />
                <Label htmlFor="terms" className="cursor-pointer">
                  Jeg accepterer vilkår og betingelser
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="insurance" />
                <Label htmlFor="insurance" className="cursor-pointer">
                  Inkluder kasko forsikring
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="maintenance" />
                <Label htmlFor="maintenance" className="cursor-pointer">
                  Service og vedligeholdelse inkluderet
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="disabled-option" disabled />
                <Label htmlFor="disabled-option" className="opacity-50">
                  Ikke tilgængelig option
                </Label>
              </div>
            </div>
          </ComponentDemo>

          <ComponentDemo title="Drivstof type" description="Dropdown til brændstof valg">
            <div className="max-w-md">
              <Label>Vælg brændstoftype</Label>
              <Select value={selectedFuelType} onValueChange={setSelectedFuelType}>
                <SelectTrigger>
                  <SelectValue placeholder="Vælg brændstof" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="benzin">
                    <div className="flex items-center gap-2">
                      <Fuel className="h-4 w-4" />
                      Benzin
                    </div>
                  </SelectItem>
                  <SelectItem value="diesel">
                    <div className="flex items-center gap-2">
                      <Fuel className="h-4 w-4" />
                      Diesel
                    </div>
                  </SelectItem>
                  <SelectItem value="hybrid">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Hybrid
                    </div>
                  </SelectItem>
                  <SelectItem value="electric">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Elektrisk
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </ComponentDemo>

          <ComponentDemo title="Notifikationer" description="Toggle for email opdateringer">
            <div className="flex items-center space-x-4">
              <Switch 
                checked={notificationsEnabled}
                onCheckedChange={setNotificationsEnabled}
              />
              <Label>Modtag email om nye tilbud</Label>
            </div>
          </ComponentDemo>

          <ComponentDemo title="Prisinterval" description="Input range til maksimal månedlig pris">
            <div className="max-w-md space-y-4">
              <Label htmlFor="price-range">Maksimal månedspris</Label>
              <div className="space-y-2">
                <Input 
                  id="price-range"
                  type="range"
                  min="2000"
                  max="25000"
                  step="500"
                  defaultValue="15000"
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>2.000 kr</span>
                  <span>25.000 kr</span>
                </div>
                <div className="text-center text-sm">
                  Nuværende: {formatPrice(15000)}
                </div>
              </div>
            </div>
          </ComponentDemo>
        </ComponentSection>

        {/* Cards Section */}
        <ComponentSection title="Kort">
          <ComponentDemo title="Bil Listing Kort" description="Hovedkomponent til visning af leasingbiler">
            <div className="max-w-md">
              <Card className="overflow-hidden">
                <div className="relative">
                  <div className="h-48 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                    <Car className="h-16 w-16 text-slate-400" />
                  </div>
                </div>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">BMW X3 xDrive20d</CardTitle>
                    <Badge variant="outline">2024</Badge>
                  </div>
                  <CardDescription>2.0 TDI Steptronic - M Sport</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold">{formatPrice(4999)}</span>
                    <span className="text-sm text-muted-foreground">inkl. moms</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{formatYear(2024)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Fuel className="h-4 w-4 text-muted-foreground" />
                      <span>Diesel</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{formatMileage(15000)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-muted-foreground" />
                      <span>190 HK</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-2">
                  <Button className="w-full">Se detaljer</Button>
                </CardFooter>
              </Card>
            </div>
          </ComponentDemo>


          <ComponentDemo title="Loading States" description="Skeleton tilstande under indlæsning">
            <div className="max-w-md">
              <Card className="overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <CardHeader className="pb-2">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4 rounded-full" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-10 w-full" />
                </CardFooter>
              </Card>
            </div>
          </ComponentDemo>
        </ComponentSection>

        {/* Alerts Section */}
        <ComponentSection title="Beskeder">
          <ComponentDemo title="Besked varianter" description="Forskellige besked typer med dansk tekst">
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Vigtigt at vide</AlertTitle>
                <AlertDescription>
                  Priserne vises eksklusiv moms og registreringsafgift. Kontakt forhandleren for det endelige tilbud.
                </AlertDescription>
              </Alert>
              
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Tilbud sendt!</AlertTitle>
                <AlertDescription className="text-green-700">
                  Din forespørgsel er sendt til forhandleren. Du hører fra dem inden for 24 timer.
                </AlertDescription>
              </Alert>
              
              <Alert className="border-red-200 bg-red-50">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-800">Der opstod en fejl</AlertTitle>
                <AlertDescription className="text-red-700">
                  Vi kunne ikke indlæse bildata. Prøv igen senere eller kontakt support.
                </AlertDescription>
              </Alert>
              
              <Alert className="border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800">Ny funktion</AlertTitle>
                <AlertDescription className="text-blue-700">
                  Du kan nu sammenligne leasing tilbud direkte fra listen. Klik på "Sammenlign" knappen.
                </AlertDescription>
              </Alert>

              <Alert className="border-orange-200 bg-orange-50">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertTitle className="text-orange-800">Begrænset tilgængelighed</AlertTitle>
                <AlertDescription className="text-orange-700">
                  Denne bil har kun få enheder på lager. Kontakt forhandleren hurtigst muligt.
                </AlertDescription>
              </Alert>
            </div>
          </ComponentDemo>
        </ComponentSection>

        {/* Badges Section */}
        <ComponentSection title="Mærkater">
          <ComponentDemo title="Status mærkater" description="Forskellige mærkater til bil status">
            <div className="flex flex-wrap gap-2">
              <Badge>Tilgængelig</Badge>
              <Badge variant="secondary">På vej</Badge>
              <Badge variant="destructive">Udsolgt</Badge>
              <Badge variant="outline">Forudbestilling</Badge>
            </div>
          </ComponentDemo>

          <ComponentDemo title="Bil specifikationer" description="Mærkater til tekniske data">
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                Automatgear
              </Badge>
              <Badge className="bg-green-100 text-green-800 border-green-200">
                Hybrid
              </Badge>
              <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                4WD
              </Badge>
              <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                Sport
              </Badge>
              <Badge variant="outline">
                Lav Kørsel
              </Badge>
              <Badge variant="outline">
                Fabriksny
              </Badge>
            </div>
          </ComponentDemo>

          <ComponentDemo title="Forhandler mærkater" description="Mærkater til forhandler information">
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                ⭐ Top Forhandler
              </Badge>
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                ✓ Verificeret
              </Badge>
              <Badge variant="outline">
                🚚 Levering inkluderet
              </Badge>
              <Badge variant="outline">
                🛡️ Garanti
              </Badge>
            </div>
          </ComponentDemo>
        </ComponentSection>

        {/* Tabs Section */}
        <ComponentSection title="Faner">
          <ComponentDemo title="Bil detalje faner" description="Faner til organisering af bil information">
            <Tabs defaultValue="overview" className="max-w-2xl">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Oversigt</TabsTrigger>
                <TabsTrigger value="specs">Tekniske data</TabsTrigger>
                <TabsTrigger value="offers">Tilbud</TabsTrigger>
                <TabsTrigger value="dealer">Forhandler</TabsTrigger>
              </TabsList>
              <TabsContent value="overview">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Car className="h-5 w-5" />
                      BMW X3 xDrive20d Oversigt
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p>En moderne SUV med avanceret firehjulstræk og effektiv dieselmotor.</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><strong>Årgang:</strong> 2024</div>
                      <div><strong>Kilometerstand:</strong> 0 km</div>
                      <div><strong>Brændstof:</strong> Diesel</div>
                      <div><strong>Effekt:</strong> 190 HK</div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="specs">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Tekniske Specifikationer
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div><strong>Motor:</strong> 2.0L TDI</div>
                      <div><strong>Transmission:</strong> 8-trins Steptronic</div>
                      <div><strong>Drivlinje:</strong> xDrive (4WD)</div>
                      <div><strong>Brændstofforbrug:</strong> 6.2L/100km</div>
                      <div><strong>CO2:</strong> 164 g/km</div>
                      <div><strong>Topfart:</strong> 213 km/t</div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="offers">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Leasing Tilbud
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                        <div>
                          <div className="font-semibold">Standard Leasing</div>
                          <div className="text-sm text-muted-foreground">36 måneder, 15.000 km/år</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{formatPrice(4999)}</div>
                          <div className="text-sm text-muted-foreground">Udbetaling: 50.000 kr</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="dealer">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      BMW Forhandler København
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm">4.8/5 (142 anmeldelser)</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Vesterbrogade 123, 1620 København V
                      </div>
                      <Button variant="outline" size="sm">Kontakt forhandler</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </ComponentDemo>
        </ComponentSection>

        {/* Design Tokens Section */}
        <ComponentSection title="Design Tokens">
          <ComponentDemo title="OKLCH Farvepalette" description="Avanceret farverum for bedre farvegengivelse">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="h-20 bg-primary rounded-lg mb-2 border"></div>
                <p className="text-sm font-medium">Primary</p>
                <p className="text-xs text-muted-foreground font-mono">oklch(0.5087 0.2234 284.33)</p>
              </div>
              <div>
                <div className="h-20 bg-secondary rounded-lg mb-2 border"></div>
                <p className="text-sm font-medium">Secondary</p>
                <p className="text-xs text-muted-foreground font-mono">oklch(0.9683 0.0069 247.8956)</p>
              </div>
              <div>
                <div className="h-20 bg-destructive rounded-lg mb-2 border"></div>
                <p className="text-sm font-medium">Destructive</p>
                <p className="text-xs text-muted-foreground font-mono">oklch(0.6368 0.2078 25.3313)</p>
              </div>
              <div>
                <div className="h-20 bg-muted rounded-lg mb-2 border"></div>
                <p className="text-sm font-medium">Muted</p>
                <p className="text-xs text-muted-foreground font-mono">oklch(0.9683 0.0069 247.8956)</p>
              </div>
            </div>
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="text-sm font-medium mb-2">Hvorfor OKLCH?</div>
              <div className="text-xs text-muted-foreground">
                OKLCH giver mere ensartede farveovergange og bedre tilgængelighed end traditionelle RGB/HSL værdier. 
                Farverummet understøtter moderne skærme og giver præcis kontrol over lysstyrke og mætning.
              </div>
            </div>
          </ComponentDemo>

          <ComponentDemo title="Centraliseret Afstand" description="Fluid spacing scale med CSS custom properties">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-20 text-sm font-mono">--space-xs</div>
                <div className="h-4 bg-primary rounded" style={{ width: 'var(--space-xs)' }}></div>
                <span className="text-sm text-muted-foreground">4-8px</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-20 text-sm font-mono">--space-sm</div>
                <div className="h-4 bg-primary rounded" style={{ width: 'var(--space-sm)' }}></div>
                <span className="text-sm text-muted-foreground">8-16px</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-20 text-sm font-mono">--space-md</div>
                <div className="h-4 bg-primary rounded" style={{ width: 'var(--space-md)' }}></div>
                <span className="text-sm text-muted-foreground">16-24px</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-20 text-sm font-mono">--space-lg</div>
                <div className="h-4 bg-primary rounded" style={{ width: 'var(--space-lg)' }}></div>
                <span className="text-sm text-muted-foreground">24-32px</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-20 text-sm font-mono">--space-xl</div>
                <div className="h-4 bg-primary rounded" style={{ width: 'var(--space-xl)' }}></div>
                <span className="text-sm text-muted-foreground">32-48px</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-20 text-sm font-mono">--space-2xl</div>
                <div className="h-4 bg-primary rounded" style={{ width: 'var(--space-2xl)' }}></div>
                <span className="text-sm text-muted-foreground">48-64px</span>
              </div>
            </div>
          </ComponentDemo>

          <ComponentDemo title="Typografi Scale" description="Fluid font sizes med clamp() funktioner">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-20 text-sm font-mono">--text-xs</div>
                <div className="text-xs">Lille tekst (12-14px)</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-20 text-sm font-mono">--text-sm</div>
                <div className="text-sm">Lille tekst (14-16px)</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-20 text-sm font-mono">--text-base</div>
                <div className="text-base">Grundtekst (16-18px)</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-20 text-sm font-mono">--text-lg</div>
                <div className="text-lg">Stor tekst (18-22px)</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-20 text-sm font-mono">--text-xl</div>
                <div className="text-xl">Ekstra stor (20-28px)</div>
              </div>
            </div>
          </ComponentDemo>

          <ComponentDemo title="Komponent Størrelser" description="Standardiserede komponent dimensioner">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">Input højde: 44px (--input-height)</div>
                <Input placeholder="Standard input højde for tilgængelighed" className="max-w-md" />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Knap højde: 48px (--button-height)</div>
                <Button>Behagelig touch target størrelse</Button>
              </div>
            </div>
          </ComponentDemo>

          <ComponentDemo title="Animation Timings" description="Centraliserede animationshastigheder">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-28 text-sm font-mono">--duration-fast</div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary rounded-full transition-transform duration-150 hover:scale-110 cursor-pointer"></div>
                  <span className="text-sm text-muted-foreground">150ms (hover effects)</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-28 text-sm font-mono">--duration-normal</div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-secondary rounded-full transition-transform duration-250 hover:scale-110 cursor-pointer"></div>
                  <span className="text-sm text-muted-foreground">250ms (standard transitions)</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-28 text-sm font-mono">--duration-slow</div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-destructive rounded-full transition-transform duration-400 hover:scale-110 cursor-pointer"></div>
                  <span className="text-sm text-muted-foreground">400ms (complex animations)</span>
                </div>
              </div>
            </div>
          </ComponentDemo>

          <ComponentDemo title="Font Konfiguration" description="Poppins font til alle tekststile">
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm font-medium mb-2">Ensartet font familie:</div>
                <div className="space-y-2 text-sm font-mono">
                  <div>--font-sans: Poppins</div>
                  <div>--font-serif: Poppins</div>
                  <div>--font-mono: Poppins</div>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Alle tekstelementer bruger Poppins for ensartet branding
                </div>
              </div>
            </div>
          </ComponentDemo>

          <ComponentDemo title="Skygger" description="Shadows er deaktiveret i designsystemet">
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm font-medium mb-2">Shadow konfiguration:</div>
                <div className="space-y-1 text-sm font-mono">
                  <div>--shadow-xs: none</div>
                  <div>--shadow-sm: none</div>
                  <div>--shadow-md: none</div>
                  <div>--shadow-lg: none</div>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Designet prioriterer flade interfaces uden skyggeeffekter
                </div>
              </div>
            </div>
          </ComponentDemo>
        </ComponentSection>

        {/* Responsive Design Section */}
        <ComponentSection title="Responsive Design">
          <ComponentDemo title="Responsive Synlighed" description="Utilities til mobile/desktop visning">
            <div className="space-y-4">
              <div className="mobile-only p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800">📱 Kun synlig på mobile enheder (under 768px)</p>
              </div>
              <div className="desktop-only p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800">🖥️ Kun synlig på desktop (768px og derover)</p>
              </div>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-gray-800">📐 Altid synlig på alle skærmstørrelser</p>
              </div>
            </div>
          </ComponentDemo>

          <ComponentDemo title="Fluid Grid" description="Responsive grid med CSS custom properties">
            <div className="hero-grid p-4 bg-muted rounded-lg">
              <div className="p-4 bg-primary text-primary-foreground rounded-lg text-center">
                <p>Dynamisk kolonne 1 (1.1fr)</p>
              </div>
              <div className="p-4 bg-secondary text-secondary-foreground rounded-lg text-center">
                <p>Dynamisk kolonne 2 (0.9fr)</p>
              </div>
            </div>
          </ComponentDemo>
        </ComponentSection>
      </div>
    </div>
  );
}