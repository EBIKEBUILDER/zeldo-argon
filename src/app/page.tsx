import BabylonCanvas from "@/components/BabylonCanvas";
import GameOverlay from "@/components/GameOverlay";

export default function HomePage() {
  return (
    <main className="game-shell">
      <BabylonCanvas />
      <GameOverlay />
    </main>
  );
}
