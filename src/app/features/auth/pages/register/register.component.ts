import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, FormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisterComponent {
  private fb = inject(NonNullableFormBuilder);
  private authService = inject(AuthService);
  
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  registerForm = this.fb.group({
    fullName: ['', [Validators.required]],
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  onSubmit() {
    if (this.registerForm.valid) {
      this.isLoading.set(true);
      const val = this.registerForm.value;
      
      const payload = {
        username: val.username || '',
        email: val.email || '',
        password: val.password || '',
        bio: 'Social explorer'
      };

      this.authService.register(payload).subscribe({
        next: () => {
          this.authService.login({
            username: val.username,
            password: val.password
          }).subscribe({
            next: () => { this.isLoading.set(false); },
            error: () => { this.isLoading.set(false); }
          });
        },
        error: (err) => {
          this.isLoading.set(false);
          const data = err?.error;
          const msg = data?.message || data?.detail ||
            (data?.username?.[0]) || (data?.email?.[0]) || (data?.password?.[0]) ||
            'Registration failed. Please try again.';
          this.errorMessage.set(msg);
        }
      });
    }
  }
}
