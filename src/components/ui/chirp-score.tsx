import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Award, Info } from "lucide-react";

export const ChirpScore = () => {
  const { user } = useAuth();

  return (
    <Card className="border-orange-500/20 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>ChirpScore</CardTitle>
        <Award className="h-5 w-5 text-orange-500" />
      </CardHeader>
      <CardContent>
        {/* Real-time Score Display */}
        <div className="text-3xl font-bold text-orange-500 mb-4">
          {user?.chirpScore ?? 0} <span className="text-sm font-normal text-muted-foreground"> ChirpScore</span>
        </div>

        <div className="text-xs text-gray-500">
          <p className="mb-2 font-semibold text-gray-700 dark:text-gray-300">How to earn points:</p>
          <ul className="list-disc pl-4 space-y-1 mb-4">
            <li>
              <strong>Post:</strong> +2 ChirpScore <span className="text-[10px]">(Max 20/day)</span>
            </li>
            <li>
              <strong>Comment:</strong> +1 ChirpScore <span className="text-[10px]">(Max 15/day)</span>
            </li>
            <li>
              <strong>Streak:</strong> +20 ChirpScore <span className="text-[10px]">(Once daily)</span>
            </li>
          </ul>

          <div className="pt-3 border-t border-orange-500/10">
            <p className="mb-2 font-semibold text-gray-700 dark:text-gray-300 flex items-center">
              <Info className="h-3 w-3 mr-1 text-orange-500" /> Community Rules:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                <strong>Create Community:</strong> <span className="text-red-500">-200 ChirpScore</span>
              </li>
              <li>
                <strong>Ownership Limit:</strong> Max 1 community per person
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};