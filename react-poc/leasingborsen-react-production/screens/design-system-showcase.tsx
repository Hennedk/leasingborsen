import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { LeaseScoreBadge } from '@/components/ui/LeaseScoreBadge';
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
  DollarSign
} from 'lucide-react';

const ComponentSection = ({ title, children }) => (
  <div className="mb-12">
    <h2 className="text-2xl font-bold mb-6 pb-2 border-b">{title}</h2>
    <div className="space-y-4">
      {children}
    </div>
  </div>
);

const ComponentDemo = ({ title, description, children }) => (
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
  const [priceRange, setPriceRange] = useState([15000]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [selectedFuelType, setSelectedFuelType] = useState('benzin');

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
        <ComponentSection title="Buttons">
          <ComponentDemo title="Button Variants" description="Different button styles for various use cases">
            <div className="flex flex-wrap gap-4">
              <Button>Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
            </div>
          </ComponentDemo>
          
          <ComponentDemo title="Button Sizes">
            <div className="flex flex-wrap items-center gap-4">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
            </div>
          </ComponentDemo>
          
          <ComponentDemo title="Button States">
            <div className="flex flex-wrap gap-4">
              <Button>Normal</Button>
              <Button disabled>Disabled</Button>
            </div>
          </ComponentDemo>
        </ComponentSection>

        {/* Form Controls Section */}
        <ComponentSection title="Form Controls">
          <ComponentDemo title="Input Fields">
            <div className="space-y-4 max-w-md">
              <div>
                <Label htmlFor="default-input">Default Input</Label>
                <Input id="default-input" placeholder="Enter text..." />
              </div>
              <div>
                <Label htmlFor="disabled-input">Disabled Input</Label>
                <Input id="disabled-input" placeholder="Disabled" disabled />
              </div>
              <div>
                <Label htmlFor="email-input">Email Input</Label>
                <Input id="email-input" type="email" placeholder="email@example.com" />
              </div>
            </div>
          </ComponentDemo>

          <ComponentDemo title="Textarea">
            <div className="max-w-md">
              <Label htmlFor="textarea">Message</Label>
              <Textarea id="textarea" placeholder="Type your message here..." rows={4} />
            </div>
          </ComponentDemo>

          <ComponentDemo title="Select">
            <div className="max-w-md">
              <Label>Choose an option</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select a fruit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apple">Apple</SelectItem>
                  <SelectItem value="banana">Banana</SelectItem>
                  <SelectItem value="orange">Orange</SelectItem>
                  <SelectItem value="grape">Grape</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </ComponentDemo>

          <ComponentDemo title="Checkbox">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="terms" 
                  checked={checkboxChecked}
                  onCheckedChange={setCheckboxChecked}
                />
                <Label htmlFor="terms" className="cursor-pointer">
                  Accept terms and conditions
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="disabled-check" disabled />
                <Label htmlFor="disabled-check" className="opacity-50">
                  Disabled checkbox
                </Label>
              </div>
            </div>
          </ComponentDemo>

          <ComponentDemo title="Radio Group">
            <RadioGroup value={selectedRadio} onValueChange={setSelectedRadio}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="option1" id="option1" />
                <Label htmlFor="option1" className="cursor-pointer">Option 1</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="option2" id="option2" />
                <Label htmlFor="option2" className="cursor-pointer">Option 2</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="option3" id="option3" />
                <Label htmlFor="option3" className="cursor-pointer">Option 3</Label>
              </div>
            </RadioGroup>
          </ComponentDemo>

          <ComponentDemo title="Switch">
            <div className="flex items-center space-x-4">
              <Switch 
                checked={switchChecked}
                onCheckedChange={setSwitchChecked}
              />
              <Label>Enable notifications</Label>
            </div>
          </ComponentDemo>

          <ComponentDemo title="Slider">
            <div className="max-w-md space-y-4">
              <Label>Volume: {sliderValue[0]}%</Label>
              <Slider 
                value={sliderValue}
                onValueChange={setSliderValue}
                max={100}
                step={1}
              />
            </div>
          </ComponentDemo>
        </ComponentSection>

        {/* Cards Section */}
        <ComponentSection title="Cards">
          <ComponentDemo title="Basic Card">
            <div className="max-w-md">
              <Card>
                <CardHeader>
                  <CardTitle>Card Title</CardTitle>
                  <CardDescription>Card description goes here</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>This is the card content. You can put any content here.</p>
                </CardContent>
                <CardFooter>
                  <Button>Action</Button>
                </CardFooter>
              </Card>
            </div>
          </ComponentDemo>
        </ComponentSection>

        {/* Alerts Section */}
        <ComponentSection title="Alerts">
          <ComponentDemo title="Alert Variants">
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Default Alert</AlertTitle>
                <AlertDescription>
                  This is a default alert with neutral styling.
                </AlertDescription>
              </Alert>
              
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Success!</AlertTitle>
                <AlertDescription className="text-green-700">
                  Your action was completed successfully.
                </AlertDescription>
              </Alert>
              
              <Alert className="border-red-200 bg-red-50">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-800">Error</AlertTitle>
                <AlertDescription className="text-red-700">
                  Something went wrong. Please try again.
                </AlertDescription>
              </Alert>
              
              <Alert className="border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800">Information</AlertTitle>
                <AlertDescription className="text-blue-700">
                  This is an informational message.
                </AlertDescription>
              </Alert>
            </div>
          </ComponentDemo>
        </ComponentSection>

        {/* Badges Section */}
        <ComponentSection title="Badges">
          <ComponentDemo title="Badge Variants">
            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge variant="outline">Outline</Badge>
            </div>
          </ComponentDemo>
        </ComponentSection>

        {/* Tabs Section */}
        <ComponentSection title="Tabs">
          <ComponentDemo title="Basic Tabs">
            <Tabs defaultValue="tab1" className="max-w-md">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="tab1">Tab 1</TabsTrigger>
                <TabsTrigger value="tab2">Tab 2</TabsTrigger>
                <TabsTrigger value="tab3">Tab 3</TabsTrigger>
              </TabsList>
              <TabsContent value="tab1">
                <Card>
                  <CardHeader>
                    <CardTitle>Tab 1 Content</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>This is the content for the first tab.</p>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="tab2">
                <Card>
                  <CardHeader>
                    <CardTitle>Tab 2 Content</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>This is the content for the second tab.</p>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="tab3">
                <Card>
                  <CardHeader>
                    <CardTitle>Tab 3 Content</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>This is the content for the third tab.</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </ComponentDemo>
        </ComponentSection>

        {/* Colors Section */}
        <ComponentSection title="Color Palette">
          <ComponentDemo title="Primary Colors">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="h-20 bg-primary rounded-lg mb-2"></div>
                <p className="text-sm font-medium">Primary</p>
              </div>
              <div>
                <div className="h-20 bg-secondary rounded-lg mb-2"></div>
                <p className="text-sm font-medium">Secondary</p>
              </div>
              <div>
                <div className="h-20 bg-destructive rounded-lg mb-2"></div>
                <p className="text-sm font-medium">Destructive</p>
              </div>
              <div>
                <div className="h-20 bg-muted rounded-lg mb-2"></div>
                <p className="text-sm font-medium">Muted</p>
              </div>
            </div>
          </ComponentDemo>
          
          <ComponentDemo title="Gray Scale">
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              <div>
                <div className="h-20 bg-gray-50 rounded-lg border mb-2"></div>
                <p className="text-sm">50</p>
              </div>
              <div>
                <div className="h-20 bg-gray-200 rounded-lg mb-2"></div>
                <p className="text-sm">200</p>
              </div>
              <div>
                <div className="h-20 bg-gray-400 rounded-lg mb-2"></div>
                <p className="text-sm">400</p>
              </div>
              <div>
                <div className="h-20 bg-gray-600 rounded-lg mb-2"></div>
                <p className="text-sm">600</p>
              </div>
              <div>
                <div className="h-20 bg-gray-800 rounded-lg mb-2"></div>
                <p className="text-sm">800</p>
              </div>
              <div>
                <div className="h-20 bg-gray-950 rounded-lg mb-2"></div>
                <p className="text-sm">950</p>
              </div>
            </div>
          </ComponentDemo>
        </ComponentSection>
      </div>
    </div>
  );
}