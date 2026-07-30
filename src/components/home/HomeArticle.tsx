import type { Article } from "@/types/article";
import { Badge } from "lucide-react";

export function HomeArticle({title, status, detailed} : Article){
    return(
        <div>
            <span className="text-4xl font-bold">{title}</span>
            <div className="flex">
                <Badge className="mr-4" />
                <span className="text-lg text-gray-300">{status}</span>
            </div>
            <span>{detailed}</span>
        </div>
    )
}