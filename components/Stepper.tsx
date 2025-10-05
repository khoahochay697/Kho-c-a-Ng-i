
import React from 'react';

interface StepperProps {
    currentStep: number;
}

const steps = [
    { number: 1, title: 'API Key' },
    { number: 2, title: 'Nhân vật' },
    { number: 3, title: 'Cảnh truyện' },
    { number: 4, title: 'Tạo Video' }
];

export const Stepper: React.FC<StepperProps> = ({ currentStep }) => {
    return (
        <div className="w-full max-w-2xl mx-auto mb-8">
            <div className="flex items-center">
                {steps.map((step, index) => (
                    <React.Fragment key={step.number}>
                        <div className="flex flex-col items-center">
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                                    ${currentStep >= step.number ? 'bg-primary-500 text-white' : 'bg-slate-700 text-slate-400'}
                                    ${currentStep === step.number ? 'ring-4 ring-primary-500/50' : ''}
                                `}
                            >
                                {step.number}
                            </div>
                            <p className={`mt-2 text-sm text-center transition-all duration-300 ${currentStep >= step.number ? 'text-primary-400 font-semibold' : 'text-slate-500'}`}>
                                {step.title}
                            </p>
                        </div>
                        {index < steps.length - 1 && (
                            <div className={`flex-1 h-1 mx-2 transition-all duration-300 ${currentStep > step.number ? 'bg-primary-500' : 'bg-slate-700'}`}></div>
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};
