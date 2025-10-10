from setuptools import setup, find_packages
import os

# Read the contents of README file
this_directory = os.path.abspath(os.path.dirname(__file__))
with open(os.path.join(this_directory, 'README.md'), encoding='utf-8') as f:
    long_description = f.read()

setup(
    name='dydx-alert',
    version='1.0.0',
    author='Mert Köklü',
    author_email='kklumert@gmail.com',
    description='Real-time liquidation and deleveraging alerts for dYdX v4 traders',
    long_description=long_description,
    long_description_content_type='text/markdown',
    url='https://github.com/justmert/dydx-alert',
    packages=find_packages(where='backend'),
    package_dir={'': 'backend'},
    classifiers=[
        'Development Status :: 4 - Beta',
        'Intended Audience :: Developers',
        'Topic :: Software Development :: Libraries :: Python Modules',
        'License :: OSI Approved :: MIT License',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.9',
        'Programming Language :: Python :: 3.10',
        'Programming Language :: Python :: 3.11',
    ],
    python_requires='>=3.9',
    install_requires=[
        'fastapi>=0.109.0',
        'uvicorn[standard]>=0.27.0',
        'sqlalchemy>=2.0.25',
        'aiosqlite>=0.19.0',
        'v4-client-py>=4.0.0',
        'python-telegram-bot>=20.7',
        'discord.py>=2.3.2',
        'aiohttp>=3.9.1',
        'requests>=2.31.0',
        'python-dotenv>=1.0.0',
        'pydantic>=2.5.3',
        'pydantic-settings>=2.1.0',
        'httpx>=0.25.0',
        'tenacity>=8.2.3',
    ],
    entry_points={
        'console_scripts': [
            'dydx-alert=app.cli:main',
        ],
    },
    include_package_data=True,
    package_data={
        '': ['*.txt', '*.md'],
    },
)