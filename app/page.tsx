'use client'

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowRight,
  Brain,
  MessageSquareMore,
  Network,
  Sparkles,
  UserPlus,
  Zap,
} from "lucide-react";
import { AuthButtons } from "@/components/ui/auth-buttons"

const features = [
  {
    icon: <Brain className="w-12 h-12 text-primary" />,
    title: "AI-Powered Knowledge Graphs",
    description:
      "Transform complex information into intuitive visual knowledge graphs with our advanced AI technology.",
  },
  {
    icon: <Network className="w-12 h-12 text-primary" />,
    title: "Dynamic Relationships",
    description:
      "Discover hidden connections and patterns in your data through intelligent relationship mapping.",
  },
  {
    icon: <MessageSquareMore className="w-12 h-12 text-primary" />,
    title: "Natural Language Interface",
    description:
      "Simply describe your knowledge structure in plain English, and watch as our AI brings it to life.",
  },
];

const ontologyBenefits = [
  {
    title: "Knowledge Architecture",
    description: "Map your organization's entire knowledge structure in an intuitive, visual format that everyone can understand.",
    icon: <Brain className="w-6 h-6 text-primary" />,
  },
  {
    title: "Process Clarity",
    description: "Document workflows, responsibilities, and relationships between different business units with crystal clarity.",
    icon: <Network className="w-6 h-6 text-primary" />,
  },
  {
    title: "Scalable Understanding",
    description: "Enable new employees to quickly grasp complex organizational structures and processes.",
    icon: <UserPlus className="w-6 h-6 text-primary" />,
  },
];

const pricingPlans = [
  {
    name: "Free Trial",
    price: "$0",
    description: "Perfect for exploring ontology AI",
    features: [
      "Up to 3 ontologies",
      "100 nodes per ontology",
      "100 relationships per ontology",
      "Basic AI assistance",
      "200 AI Assistant Prompts",
      "Community support",
    ],
    buttonText: "Get Started",
    popular: false,
  },
  {
    name: "Pro",
    price: "$100",
    period: "/seat/month",
    description: "Ideal for professionals and growing teams",
    features: [
      "5 seats included",
      "Up to 50 ontologies",
      "1,000 nodes per ontology",
      "2,000 relationships per ontology",
      "Advanced AI features",
      "Priority support",
      "Custom node types",
      "Export capabilities",
    ],
    buttonText: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For organizations with advanced needs",
    features: [
      "Unlimited everything",
      "Custom AI model training",
      "Dedicated support",
      "API access",
      "SSO integration",
      "Custom deployment options",
    ],
    buttonText: "Contact Sales",
    popular: false,
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-4 bg-gradient-to-b from-background to-secondary/20">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Transform Your Knowledge into
            <br />
            Visual Intelligence
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Harness the power of AI to create, visualize, and explore complex knowledge graphs with unprecedented ease.
          </p>
          <div className="flex gap-4 justify-center">
            <AuthButtons />
          </div>
          <div className="mt-12">
            <div className="aspect-video max-w-4xl mx-auto bg-secondary/40 rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground">Product Demo Video/Screenshot</p>
            </div>
          </div>
        </div>
      </section>

      {/* PAS (Problem-Agitate-Solution) Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12">
            {/* Problem */}
            <Card className="bg-background/50 border-destructive">
              <CardHeader>
                <div className="mb-4">
                  <span className="text-destructive text-sm font-semibold">THE PROBLEM</span>
                </div>
                <CardTitle>Organizational Blindness</CardTitle>
                <CardDescription className="text-base">
                  Most organizations operate in the dark, with critical knowledge scattered across departments, 
                  outdated documentation, and no clear view of how their business actually functions.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Agitation */}
            <Card className="bg-background/50 border-warning">
              <CardHeader>
                <div className="mb-4">
                  <span className="text-warning text-sm font-semibold">THE IMPACT</span>
                </div>
                <CardTitle>Costly Consequences</CardTitle>
                <CardContent className="p-0 space-y-3">
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-warning">•</span>
                      Wasted time reinventing existing processes
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-warning">•</span>
                      Knowledge loss when employees leave
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-warning">•</span>
                      Slow onboarding and training cycles
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-warning">•</span>
                      Duplicate efforts across teams
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-warning">•</span>
                      Missed opportunities for optimization
                    </li>
                  </ul>
                </CardContent>
              </CardHeader>
            </Card>

            {/* Solution */}
            <Card className="bg-background/50 border-primary">
              <CardHeader>
                <div className="mb-4">
                  <span className="text-primary text-sm font-semibold">THE SOLUTION</span>
                </div>
                <CardTitle>AI-Powered Clarity</CardTitle>
                <CardContent className="p-0">
                  <p className="text-muted-foreground mb-4">
                    Our AI Business Analyst works 24/7 to map, maintain, and optimize your organizational knowledge.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span>Automated process discovery</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span>Real-time documentation updates</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span>Intelligent optimization suggestions</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="px-0 pt-4">
                  <AuthButtons />
                </CardFooter>
              </CardHeader>
            </Card>
          </div>

          {/* Impact Statement */}
          <div className="mt-12 text-center">
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Organizations waste up to <span className="text-primary font-bold">30% of their revenue</span> due 
              to process inefficiencies and knowledge gaps. Stop letting valuable insights slip through the cracks.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Powerful Features for Complex Knowledge
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="mb-4">{feature.icon}</div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* AI Business Analyst Section */}
      <section className="py-20 px-4 bg-secondary/20">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Your AI Business Intelligence Partner
              </h2>
              <p className="text-xl text-muted-foreground mb-6">
                Meet your new AI-powered business analyst that never sleeps, continuously analyzing your organization&apos;s processes to uncover hidden opportunities.
              </p>
              <ul className="space-y-4">
                {[
                  "Automatically identifies operational bottlenecks and inefficiencies",
                  "Provides data-driven recommendations for process optimization",
                  "Learns your business context to deliver personalized insights",
                  "Monitors process health and alerts you to potential issues",
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Sparkles className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-secondary/40 rounded-lg aspect-square flex items-center justify-center">
              <p className="text-muted-foreground">AI Analysis Visualization</p>
            </div>
          </div>
        </div>
      </section>

      {/* Understanding Ontologies Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Why Your Business Needs an Ontology
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              An ontology is more than just documentation&mdash;it&apos;s a living map of your organization&apos;s DNA, capturing the essence of how your business operates, connects, and evolves.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {ontologyBenefits.map((benefit, index) => (
              <Card key={index} className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="mb-4">{benefit.icon}</div>
                  <CardTitle>{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Living Documentation Section */}
      <section className="py-20 px-4 bg-secondary/20">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="bg-secondary/40 rounded-lg aspect-square flex items-center justify-center">
              <p className="text-muted-foreground">Interactive Documentation Demo</p>
            </div>
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Living Documentation That Evolves With You
              </h2>
              <p className="text-xl text-muted-foreground mb-6">
                Traditional documentation becomes outdated the moment it&apos;s written. Our platform keeps your organizational knowledge alive, accurate, and accessible.
              </p>
              <div className="space-y-4">
                <Card className="border-primary/50">
                  <CardHeader>
                    <CardTitle className="text-lg">Distributed Knowledge</CardTitle>
                    <CardDescription>
                      Enable every team member to contribute to and access organizational knowledge in real-time.
                    </CardDescription>
                  </CardHeader>
                </Card>
                <Card className="border-primary/50">
                  <CardHeader>
                    <CardTitle className="text-lg">Always Up-to-Date</CardTitle>
                    <CardDescription>
                      Automatic updates and AI-assisted maintenance ensure your documentation stays current with your business evolution.
                    </CardDescription>
                  </CardHeader>
                </Card>
                <Card className="border-primary/50">
                  <CardHeader>
                    <CardTitle className="text-lg">Actionable Insights</CardTitle>
                    <CardDescription>
                      Transform static documentation into dynamic insights that drive better decision-making across your organization.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 bg-secondary/20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Simple, Transparent Pricing
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative ${plan.popular ? 'border-primary shadow-lg scale-105' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary px-3 py-1 rounded-full text-sm text-primary-foreground">
                    Most Popular
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>
                    <span className="text-3xl font-bold">{plan.price}</span>
                    {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
                  </CardDescription>
                  <p className="text-muted-foreground">{plan.description}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full gap-2" 
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {plan.buttonText}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Your Journey to Organizational Clarity
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Transform your organization&apos;s knowledge into actionable intelligence in five simple steps.
            </p>
          </div>

          <div className="space-y-12">
            {[
              {
                step: "1",
                title: "Map Your Organization",
                description: "Create dynamic ontologies that mirror your organizational structure with our intuitive interface or let our AI guide you through the process.",
                icon: <Network className="w-8 h-8" />,
                highlight: "AI-assisted mapping available"
              },
              {
                step: "2",
                title: "Build Knowledge Graphs",
                description: "Choose your preferred approach: manually craft precise knowledge graphs or leverage our AI assistant to automatically generate and maintain them.",
                icon: <Brain className="w-8 h-8" />,
                highlight: "Visual drag-and-drop interface"
              },
              {
                step: "3",
                title: "Import Existing Documentation",
                description: "Simply provide your existing documents, and watch as our AI transforms them into structured, interconnected knowledge graphs.",
                icon: <MessageSquareMore className="w-8 h-8" />,
                highlight: "Automatic document processing"
              },
              {
                step: "4",
                title: "Connect Your Tools",
                description: "Integrate with your existing software ecosystem to enable real-time process mining and continuous knowledge updates.",
                icon: <Zap className="w-8 h-8" />,
                highlight: "Seamless integrations"
              },
              {
                step: "5",
                title: "Optimize with AI",
                description: "Partner with your AI Business Analyst to identify improvements, implement solutions, and proactively prevent issues.",
                icon: <Sparkles className="w-8 h-8" />,
                highlight: "Continuous optimization"
              }
            ].map((step, index) => (
              <div key={index} className="relative">
                <div className="grid md:grid-cols-[1fr,3fr] gap-8 items-center">
                  <div className="hidden md:flex justify-center">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full bg-secondary/40 flex items-center justify-center">
                        {step.icon}
                      </div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        {step.step}
                      </div>
                    </div>
                  </div>
                  <Card>
                    <CardHeader>
                      <div className="md:hidden flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-secondary/40 flex items-center justify-center">
                          {step.icon}
                        </div>
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                          {step.step}
                        </div>
                      </div>
                      <CardTitle className="text-2xl mb-2">{step.title}</CardTitle>
                      <CardDescription className="text-base">
                        {step.description}
                      </CardDescription>
                    </CardHeader>
                    <CardFooter>
                      <p className="text-sm text-primary flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        {step.highlight}
                      </p>
                    </CardFooter>
                  </Card>
                </div>
                {index < 4 && (
                  <div className="hidden md:block absolute left-[calc(25%-12px)] top-[calc(100%-12px)] w-0.5 h-12 bg-border" />
                )}
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <AuthButtons />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Transform Your Knowledge?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of professionals who are already using our platform to organize and visualize their knowledge.
          </p>
          <AuthButtons />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="max-w-6xl mx-auto px-4 text-center text-muted-foreground">
          <p>© 2024 Your Company. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
} 