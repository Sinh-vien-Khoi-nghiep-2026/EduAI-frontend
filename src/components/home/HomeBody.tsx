import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import home from "@/assets/home.jpg";
import { HomeArticle } from "./HomeArticle";
export function HomeBody() {
  const data = {
    title: "Quantum Mechanics III: Advanced Particles",
    status: "In Progress",
    detailed:
      "Module 4: Schrödinger Equation in Three Dimensions & Spherical Coordinates.",
  };
  return (
    <div className="flex gap-12">
      <Card className="w-64 flex-auto">
        <CardContent className="grid grid-cols-9 gap-4">
          <img src={home} className="col-span-4" alt="home image" />
          <div className="col-span-5">
            <HomeArticle
              title={data.title}
              status={data.status}
              detailed={data.detailed}
            />
          </div>
        </CardContent>
      </Card>
      <Card className="w-32 flex-auto">
        <CardHeader>
          <CardTitle>Home Body, Welcomback!</CardTitle>
          <CardDescription>Card Description</CardDescription>
          <CardAction>Card Action</CardAction>
        </CardHeader>
      </Card>
    </div>
  );
}
