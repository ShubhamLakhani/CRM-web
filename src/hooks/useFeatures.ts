import { useQuery } from '@tanstack/react-query';
import { featuresService } from '../services/api';
import { useAuth } from '../providers/AuthProvider';

export function useFeatures() {
  const { isAuthenticated } = useAuth();

  // Query feature flag configurations for the current organization
  const featuresQuery = useQuery({
    queryKey: ['features'],
    queryFn: () => featuresService.getFeatures(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const features: Record<string, boolean> = featuresQuery.data || {};

  const isFeatureEnabled = (featureId: string): boolean => {
    return !!features[featureId];
  };

  return {
    features,
    isLoading: featuresQuery.isLoading,
    isError: featuresQuery.isError,
    isFeatureEnabled,
    refetch: featuresQuery.refetch,
  };
}
