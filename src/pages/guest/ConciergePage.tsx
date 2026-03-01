import { MapPin, Utensils, Info, Phone, Star } from '@/components/icons'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Button } from '../../components/ui/button'

const LOCAL_GEMS = {
    eat: [
        {
            name: "The Fisherman's Rest",
            type: "Seafood • $$$",
            desc: "Fresh daily catch with ocean views. Best for sunset dinner.",
            distance: "5 min drive",
            phone: "+233 55 555 5555",
            rating: "4.8"
        },
        {
            name: "Mama's Kitchen",
            type: "Local • $",
            desc: "Authentic Jollof and Banku. A favorite among locals.",
            distance: "10 min walk",
            rating: "4.6"
        },
        {
            name: "Blue Lagooon Bar",
            type: "Drinks & Snacks • $$",
            desc: "Chill vibes, live music on weekends.",
            distance: "7 min drive",
            rating: "4.3"
        }
    ],
    do: [
        {
            name: "Kakum National Park",
            type: "Nature",
            desc: "Walk on the famous canopy walkway. Arrive early!",
            distance: "45 min drive",
            rating: "4.9"
        },
        {
            name: "Cape Coast Castle",
            type: "History",
            desc: "Powerful historical tour. Guide recommended.",
            distance: "20 min drive",
            rating: "4.7"
        },
        {
            name: "Local Market Tour",
            type: "Culture",
            desc: "Experience the vibrant colors and sounds of the market.",
            distance: "15 min drive",
            rating: "4.5"
        }
    ],
    practical: [
        {
            name: "City Pharmacy",
            type: "Health",
            desc: "Open 24/7. Located on Main St.",
            phone: "+233 20 000 0000",
            rating: "4.2"
        },
        {
            name: "Forex Bureau",
            type: "Money",
            desc: "Best rates for USD/EUR exchange.",
            distance: "Downtown",
            rating: "4.0"
        }
    ]
}

export function ConciergePage() {
    return (
        <div className="space-y-6 pb-20 animate-fade-in">
            <div>
                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Local Guide</h2>
                <p className="text-base text-gray-600 font-medium mt-1">Curated recommendations for your stay.</p>
            </div>

            <Tabs defaultValue="eat" className="w-full">
                <TabsList className="grid w-full grid-cols-3 h-12 bg-neutral-100 rounded-xl p-1">
                    <TabsTrigger value="eat" className="rounded-lg font-bold text-sm data-[state=active]:shadow-md">🍽️ Eat & Drink</TabsTrigger>
                    <TabsTrigger value="do" className="rounded-lg font-bold text-sm data-[state=active]:shadow-md">🎯 Activities</TabsTrigger>
                    <TabsTrigger value="info" className="rounded-lg font-bold text-sm data-[state=active]:shadow-md">ℹ️ Info</TabsTrigger>
                </TabsList>

                <TabsContent value="eat" className="space-y-4 mt-4 data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2">
                    {LOCAL_GEMS.eat.map((place, i) => (
                        <GemCard key={i} item={place} icon={<Utensils className="w-4 h-4" />} />
                    ))}
                </TabsContent>

                <TabsContent value="do" className="space-y-4 mt-4 data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2">
                    {LOCAL_GEMS.do.map((place, i) => (
                        <GemCard key={i} item={place} icon={<MapPin className="w-4 h-4" />} />
                    ))}
                </TabsContent>

                <TabsContent value="info" className="space-y-4 mt-4 data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2">
                    {LOCAL_GEMS.practical.map((place, i) => (
                        <GemCard key={i} item={place} icon={<Info className="w-4 h-4" />} />
                    ))}
                </TabsContent>
            </Tabs>
        </div>
    )
}

function GemCard({ item, icon }: { item: any, icon: any }) {
    return (
        <Card className="border-0 shadow-md ring-1 ring-black/5 hover:shadow-lg hover:scale-[1.01] transition-all duration-200 overflow-hidden">
            <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start">
                    <div className="flex-1">
                        <CardTitle className="text-lg font-bold text-gray-900">{item.name}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1 text-sm font-medium">
                            {icon}
                            <span>{item.type}</span>
                            {item.rating && (
                                <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                    {item.rating}
                                </span>
                            )}
                        </CardDescription>
                    </div>
                    {item.distance && (
                        <span className="text-xs font-bold bg-primary/10 text-primary px-3 py-1.5 rounded-full whitespace-nowrap">
                            {item.distance}
                        </span>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-2">
                <p className="text-sm text-gray-700 font-medium mb-3 leading-relaxed">{item.desc}</p>
                {item.phone && (
                    <Button variant="outline" size="sm" className="w-full font-bold border-2 hover:bg-primary/5 hover:border-primary/30 transition-all duration-200" asChild>
                        <a href={`tel:${item.phone}`}>
                            <Phone className="w-4 h-4 mr-2" />
                            Call Now
                        </a>
                    </Button>
                )}
            </CardContent>
        </Card>
    )
}
