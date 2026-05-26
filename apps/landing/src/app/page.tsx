import { LandingFooter } from '@/components/landing/landing-footer';
import { LandingGraph } from '@/components/landing/landing-graph';
import { LandingHero } from '@/components/landing/landing-hero';
import { LandingHow } from '@/components/landing/landing-how';
import { LandingLocal } from '@/components/landing/landing-local';
import { LandingMcp } from '@/components/landing/landing-mcp';
import { LandingNav } from '@/components/landing/landing-nav';
import { LandingProblem } from '@/components/landing/landing-problem';
import { LandingReveal } from '@/components/landing/landing-reveal';
import { LandingTerminalSection } from '@/components/landing/landing-terminal';

export default function Page() {
    return (
        <>
            <LandingReveal />
            <LandingNav />
            <main>
                <LandingHero />
                <LandingProblem />
                <LandingHow />
                <LandingGraph />
                <LandingLocal />
                <LandingTerminalSection />
                <LandingMcp />
            </main>
            <LandingFooter />
        </>
    );
}
