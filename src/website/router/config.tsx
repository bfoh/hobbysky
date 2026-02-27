
import React, { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

const HomePage = lazy(() => import('../pages/home/page'));
const GalleryPage = lazy(() => import('../pages/gallery/page'));
const ContactPage = lazy(() => import('../pages/contact/page'));
const BookNowPage = lazy(() => import('../pages/book-now/page'));
const NotFound = lazy(() => import('../pages/NotFound'));

const routes: RouteObject[] = [
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/gallery',
    element: <GalleryPage />,
  },
  {
    path: '/contact-us',
    element: <ContactPage />,
  },
  {
    path: '/book-now',
    element: <BookNowPage />,
  },
  {
    path: '*',
    element: <NotFound />,
  },
];

export default routes;
