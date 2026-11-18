import { Redirect, useLocalSearchParams } from 'expo-router';

/** Enlace desde el widget: treadmillurbis://add?mode=voice|text|photo */
export default function Add() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  return <Redirect href={{ pathname: '/', params: { add: mode || 'menu' } }} />;
}
