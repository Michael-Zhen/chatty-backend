import { Password } from '@auth/controllers/password';
import { Signin } from '@auth/controllers/signin';
import { Singout } from '@auth/controllers/signout';
import { Signup } from '@auth/controllers/signup';
import express, { Router } from 'express';

class AuthRoutes {
  private router: Router;

  constructor() {
    this.router = express.Router();
  }

  public routes(): Router {
    this.router.post('/signup', Signup.prototype.create);
    this.router.post('/signin', Signin.prototype.read);
    this.router.post('/forgot-password', Password.prototype.create);
    this.router.post('/reset-password/:token', Password.prototype.update);
    return this.router;
  }

  public singoutRoute(): Router {
    this.router.get('/signout', Singout.prototype.update);
    return this.router;
  }
}

export const authRoutes: AuthRoutes = new AuthRoutes();
