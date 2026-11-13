window.OPTICS_TUTORIAL_DATA = {
  course: {
    title: "Geometrical Optics",
    level: "L2 · S3",
    coverage: "USTHB Faculty of Physics syllabus-complete topic and question-family map",
    note: "Core mastery covers the six published S3 chapters: principles/laws, mirrors, diopters, prism, thin lenses and optical instruments."
  },

  theories: {
    rayModel: {
      title: "Theory build-up — ray model, refractive index and optical path",
      points: [
        "Geometrical optics replaces the wavefront by rays normal to it. The approximation is reliable when the characteristic sizes of apertures and obstacles are much larger than the wavelength.",
        "In a homogeneous transparent medium light travels rectilinearly. The refractive index is n = c/v; a larger n means a smaller phase velocity.",
        "Relative refractive index from medium 1 to medium 2 is n21 = n2/n1.",
        "Optical path is Lopt = integral(n ds); in a uniform segment it is nL. Travel time is t = Lopt/c.",
        "Reversibility: if a ray can follow A to B through passive optical media, the reversed ray can follow B to A."
      ]
    },
    objectImage: {
      title: "Theory build-up — objects, images and stigmatisme",
      points: [
        "A real object is a point from which incident rays actually diverge; a virtual object is the point toward which incident rays are converging before entering the system.",
        "A real image is an actual convergence point of emergent rays; a virtual image is obtained from backward extensions of emergent rays.",
        "A system is stigmatic for A and A' when every ray from A passing through the system emerges through A'. Exact stigmatisme is rare.",
        "Under Gauss/paraxial conditions (small angles and rays close to the axis), centred systems are approximately stigmatic and formulas of conjugation apply."
      ]
    },
    fermatHuygens: {
      title: "Theory build-up — Fermat, Huygens and Snell–Descartes",
      points: [
        "Fermat principle: the optical path between two fixed points is stationary for the actual ray.",
        "Huygens construction treats every point of a wavefront as a source of secondary wavelets; the new wavefront is their envelope.",
        "Reflection law: the reflected ray remains in the plane of incidence and i = r.",
        "Refraction law: n1 sin(i) = n2 sin(r). Angles are measured from the normal.",
        "If n2 > n1 the refracted ray bends toward the normal; if n2 < n1 it bends away."
      ]
    },
    tirPlate: {
      title: "Theory build-up — critical angle, total internal reflection and plane plates",
      points: [
        "Total internal reflection can occur only from the more refringent medium to the less refringent medium.",
        "At the critical angle ic, the refracted angle is 90 degrees: sin(ic) = n2/n1 for n1 > n2.",
        "For a plane-parallel plate, the emerging ray is parallel to the incident ray but is laterally shifted.",
        "For plate thickness e, incidence i and internal angle r, lateral shift d = e sin(i-r)/cos(r).",
        "Near normal incidence at a plane interface, apparent depth / real depth = n_observer/n_object-medium."
      ]
    },
    planeMirror: {
      title: "Theory build-up — plane mirror",
      points: [
        "A plane mirror forms the point image symmetric to the object with respect to the mirror plane.",
        "The image is virtual for a real object, upright and has transverse magnification +1.",
        "Object and image distances from the mirror have equal magnitudes.",
        "If the mirror translates by delta x while the object is fixed, the laboratory image position changes by 2 delta x.",
        "If the mirror rotates by angle alpha while the incident ray is fixed, the reflected ray rotates by 2 alpha."
      ]
    },
    sphericalMirror: {
      title: "Theory build-up — spherical mirrors",
      points: [
        "A spherical mirror is characterized by vertex S, centre C, radius R = SC and focal point F. In Gauss conditions, SF = SC/2.",
        "Using oriented distances from S, one common Descartes form is 1/SA' + 1/SA = 2/SC. Always keep one sign convention consistently.",
        "With real-positive magnitudes for elementary calculations, 1/f = 1/do + 1/di and m = -di/do.",
        "Principal construction rays: parallel to axis reflects through F; through F reflects parallel; through C reflects back on itself.",
        "Concave mirrors can form real or virtual images depending on object position; convex mirrors with real objects give virtual, upright, reduced images."
      ]
    },
    diopter: {
      title: "Theory build-up — spherical diopter",
      points: [
        "A diopter is a refracting interface between indices n and n'. For a spherical diopter, R = SC is oriented.",
        "Paraxial conjugation: n'/SA' - n/SA = (n'-n)/SC.",
        "Transverse magnification: gamma = n SA'/(n' SA).",
        "Focal distances: SF' = n'R/(n'-n) and SF = -nR/(n'-n).",
        "Surface power in SI units is Phi = (n'-n)/R in dioptres when R is in metres."
      ]
    },
    planeDiopter: {
      title: "Theory build-up — plane diopter",
      points: [
        "A plane diopter is the limit R tending to infinity of a spherical diopter.",
        "Its paraxial conjugation becomes n'/SA' = n/SA.",
        "It has zero optical power and focal points at infinity, but it changes apparent depth because angles change at refraction.",
        "For an object in index n viewed from index n' near the normal, apparent depth = real depth × n'/n."
      ]
    },
    prism: {
      title: "Theory build-up — prism geometry and deviation",
      points: [
        "For a prism of apex angle A: r1 + r2 = A.",
        "At the two faces: sin i = n sin r1 and n sin r2 = sin e for a prism in air.",
        "Total deviation is D = i + e - A.",
        "At minimum deviation the path is symmetric: i = e and r1 = r2 = A/2.",
        "Thus n = sin[(A + Dmin)/2] / sin(A/2). Emergence also requires the internal incidence on the second face to be below the critical angle."
      ]
    },
    dispersion: {
      title: "Theory build-up — prism dispersion",
      points: [
        "In normal dispersion, refractive index decreases as wavelength increases, so violet light is generally more refracted and more deviated than red light.",
        "Minimum deviation therefore depends on wavelength through n(lambda).",
        "A common visible-range empirical model is Cauchy: n(lambda) = A + B/lambda^2 (with units chosen consistently).",
        "Plotting n against 1/lambda^2 should give a straight line with intercept A and slope B."
      ]
    },
    lensMaker: {
      title: "Theory build-up — thin lens shape, power and lens-maker relation",
      points: [
        "A thin spherical lens is bounded by two refracting surfaces; converging lenses have positive focal length/power and diverging lenses negative focal length/power under the usual convention.",
        "In air, 1/f' = (n-1)(1/R1 - 1/R2) for a thin lens with oriented radii.",
        "Vergence/power Phi = 1/f' in dioptres when f' is in metres.",
        "For a lens in a surrounding medium of index nm, replace (n-1) by (n/nm - 1)."
      ]
    },
    thinLens: {
      title: "Theory build-up — thin-lens conjugation and construction",
      points: [
        "For elementary real-positive calculations: 1/f = 1/do + 1/di and m = -di/do.",
        "In oriented-distance form, a centred thin lens can be handled with the corresponding Descartes relation; use the course sign convention consistently.",
        "Principal rays for a converging lens: parallel ray emerges through F'; ray through optical centre is undeviated in the thin-lens model; ray through F emerges parallel.",
        "Object beyond 2F gives a real inverted reduced image between F' and 2F'; at 2F the image is same size; between F and 2F the real image is enlarged beyond 2F'; inside F the image is virtual and upright.",
        "A diverging lens with a real object gives a virtual, upright, reduced image."
      ]
    },
    lensSystems: {
      title: "Theory build-up — lens combinations and Newton form",
      points: [
        "For thin lenses in contact, powers add: Phi_eq = Phi1 + Phi2.",
        "For two thin lenses separated by distance d in air: Phi_eq = Phi1 + Phi2 - d Phi1 Phi2.",
        "An afocal two-lens system has zero equivalent power for parallel input; for two converging lenses in Kepler configuration, separation is f1 + f2.",
        "Newton conjugation uses distances x and x' measured from object and image focal points: xx' = f f' (for the symmetric thin lens in air, f'^2 in magnitudes)."
      ]
    },
    eye: {
      title: "Theory build-up — reduced eye, accommodation and defects",
      points: [
        "The reduced eye is modelled as a converging optical system focusing on the retina.",
        "For an emmetropic relaxed eye, the far point is at infinity. Accommodation increases optical power to focus nearer objects.",
        "Accommodation amplitude in dioptres is A = 1/PP - 1/PR with distances in metres (using magnitudes for the usual clinical formula).",
        "Myopia: far point is finite; a diverging lens moves an object at infinity to that far point.",
        "Hyperopia/presbyopia for near work is corrected with positive power so the target appears at a point the eye can focus."
      ]
    },
    magnifier: {
      title: "Theory build-up — simple magnifier",
      points: [
        "A magnifier is a converging lens used with the object inside or near its focal distance to increase angular size.",
        "With reference near distance D (conventionally 25 cm), relaxed-eye angular magnification is G = D/f.",
        "When the final virtual image is adjusted to the near point, a common expression is G = 1 + D/f.",
        "The final image seen through a magnifier is virtual, upright and angularly enlarged."
      ]
    },
    microscope: {
      title: "Theory build-up — compound microscope",
      points: [
        "The objective is a short-focal-length converging lens that forms a real, inverted, enlarged intermediate image.",
        "The eyepiece acts as a magnifier for that intermediate image and produces the final virtual image.",
        "Total angular magnification magnitude is approximately |G| = |m_objective| × G_eyepiece.",
        "For a common relaxed-eye approximation, |G| ≈ (L/f_objective)(D/f_eyepiece), where L is the optical tube length and D is the reference near distance."
      ]
    }
  },

  series: [
    {id:"s1",code:"Chapter 1",title:"Principles & Laws of Geometrical Optics",summary:"Ray approximation, objects/images, stigmatisme, refringence, optical path, Fermat, Huygens, reflection, refraction and total internal reflection.",topics:["Ray approximation","Objects/images","Stigmatisme and Gauss conditions","Refractive and relative indices","Optical path and time","Fermat principle","Huygens construction","Reflection","Refraction","Reversibility","Critical angle","Plane plate and apparent depth"]},
    {id:"s2",code:"Chapter 2",title:"Mirrors",summary:"Plane and spherical mirrors: image construction, field/visibility reasoning, conjugation, focal points, magnification and motion/rotation effects.",topics:["Plane mirror","Visibility/field","Mirror translation","Mirror rotation","Two mirrors","Spherical mirror geometry","Focal points","Conjugation","Magnification","Ray construction"]},
    {id:"s3",code:"Chapter 3",title:"Diopters",summary:"Plane and spherical refracting surfaces, Gauss conjugation, focal points, magnification, power, apparent position and construction.",topics:["Spherical diopter","Conjugation","Magnification","Focal points","Surface power","Plane diopter","Apparent depth","Construction","Stigmatisme/Gauss"]},
    {id:"s4",code:"Chapter 4",title:"Prism",summary:"Prism geometry, deviation, emergence, minimum deviation, refractive-index determination and dispersion.",topics:["Prism geometry","Deviation","Emergence condition","Minimum deviation","Index measurement","Dispersion","Cauchy law","Unknown wavelength"]},
    {id:"s5",code:"Chapter 5",title:"Thin Lenses",summary:"Lens types, lens-maker relation, power, conjugation, magnification, constructions and combinations.",topics:["Lens shapes","Lens-maker relation","Power","Conjugation","Image cases","Magnification","Ray construction","Newton form","Contact lenses","Separated lenses","Afocal systems"]},
    {id:"s6",code:"Chapter 6",title:"Optical Instruments",summary:"The reduced eye, accommodation and corrections, simple magnifier and compound microscope.",topics:["Reduced eye","Accommodation","Near/far points","Myopia","Hyperopia/presbyopia","Magnifier","Microscope objective","Eyepiece","Total magnification"]}
  ],

  questions: [
    {id:"s1q1",series:"s1",theory:"rayModel",title:"Validity of the ray approximation",level:1,kind:"mcq",options:["A 1 cm diaphragm","A 10 micrometre slit","An isolated atom","A 600 nm-scale opening"],correct:0,objectives:["Ray approximation"],prompt:"Light has wavelength 600 nm. Which listed object most clearly satisfies the geometrical-optics condition without requiring a diffraction treatment?",solution:["The geometrical-optics approximation requires characteristic size much larger than wavelength.","1 cm / 600 nm is about 1.7×10^4, so the centimetre diaphragm is safely in the ray-optics regime."]},
    {id:"s1q2",series:"s1",theory:"objectImage",title:"Classify real and virtual objects/images",level:1,kind:"manual",objectives:["Objects and images"],prompt:"State a ray-based test for classifying a point as a real object, virtual object, real image or virtual image of an optical system.",solution:["Real object: incident rays actually diverge from the point.","Virtual object: incident rays converge toward the point before the system.","Real image: emergent rays actually converge at the point.","Virtual image: backward extensions of emergent rays meet at the point."]},
    {id:"s1q3",series:"s1",theory:"objectImage",title:"Stigmatisme and Gauss conditions",level:2,kind:"manual",objectives:["Stigmatisme","Gauss conditions"],prompt:"Define stigmatisme for a pair of conjugate points. Why are Gauss conditions introduced in centred optical systems?",solution:["A system is stigmatic for A and A' if all rays from A that traverse the system emerge through A'.","Most practical centred systems are not exactly stigmatic for arbitrary rays.","Restricting to paraxial rays and small angles yields approximate stigmatisme and simple linear conjugation formulas."]},
    {id:"s1q4",series:"s1",theory:"rayModel",title:"Index from propagation speed",level:1,kind:"numeric",answer:1.5,tol:0.01,unit:"",objectives:["Refractive index"],prompt:"Light travels at 2.00×10^8 m/s in a transparent medium. Find its refractive index using c=3.00×10^8 m/s.",solution:["n=c/v=(3.00×10^8)/(2.00×10^8)=1.50."]},
    {id:"s1q5",series:"s1",theory:"rayModel",title:"Relative refringence",level:1,kind:"numeric",answer:1.128,tol:0.01,unit:"",objectives:["Relative refractive index"],prompt:"Water has n1=1.33 and glass has n2=1.50. Find the refractive index of glass relative to water, n21.",solution:["n21=n2/n1=1.50/1.33=1.128 approximately.","Because n21>1, glass is more refringent than water."]},
    {id:"s1q6",series:"s1",theory:"rayModel",title:"Optical path through layered media",level:2,kind:"numeric",answer:6.5,tol:0.05,unit:"cm",objectives:["Optical path"],prompt:"A ray travels normally through 2.00 cm of air (n=1.00) then 3.00 cm of glass (n=1.50). Find the total optical path.",solution:["Lopt=sum(n_i L_i)=1.00×2.00+1.50×3.00=6.50 cm."]},
    {id:"s1q7",series:"s1",theory:"rayModel",title:"Travel time from optical path",level:2,kind:"numeric",answer:10,tol:0.1,unit:"ns",objectives:["Optical path","Travel time"],prompt:"A ray crosses 2.00 m of glass of index 1.50. Find the propagation time, using c=3.00×10^8 m/s.",solution:["Optical path is nL=3.00 m.","t=Lopt/c=3.00/(3.00×10^8)=1.00×10^-8 s=10.0 ns."]},
    {id:"s1q8",series:"s1",theory:"fermatHuygens",title:"Reflection from Fermat principle",level:3,kind:"manual",objectives:["Fermat principle","Reflection"],prompt:"Explain how Fermat principle leads to equality of incidence and reflection angles at a plane mirror.",solution:["Replace the reflected path A-P-B by a straight path from A to the mirror image B* of B.","The stationary/shortest geometric path A-P-B* is a straight line.","Symmetry about the mirror normal then gives i=r."]},
    {id:"s1q9",series:"s1",theory:"fermatHuygens",title:"Huygens construction of refraction",level:3,kind:"manual",objectives:["Huygens construction","Refraction"],prompt:"Describe the Huygens wavefront construction at an interface and show qualitatively why a wave entering a slower medium bends toward the normal.",solution:["Points of the incident wavefront reaching the interface generate secondary wavelets.","In the slower medium the wavelets grow more slowly, so the refracted wavefront pivots toward the interface.","The ray is normal to the wavefront, hence the refracted ray rotates toward the normal.","The geometry yields n1 sin i=n2 sin r."]},
    {id:"s1q10",series:"s1",theory:"fermatHuygens",title:"Snell–Descartes numerical refraction",level:1,kind:"numeric",answer:19.47,tol:0.15,unit:"deg",figure:"refraction",objectives:["Snell law"],prompt:"A ray passes from air n1=1.00 into glass n2=1.50 at i=30.0 degrees. Find r.",solution:["n1 sin i=n2 sin r.","sin r=(1/1.50)sin30=1/3.","r=19.47 degrees."]},
    {id:"s1q11",series:"s1",theory:"fermatHuygens",title:"Reversibility of a refracted ray",level:2,kind:"manual",objectives:["Reversibility","Snell law"],prompt:"A ray goes from air into glass at i=30.0 degrees and r=19.47 degrees. What angles occur if the same ray path is traversed backward?",solution:["Optical reversibility means the path is exactly retraced.","From glass, incidence is 19.47 degrees and the ray emerges into air at 30.0 degrees.","Snell law is unchanged when the media and angles are interchanged."]},
    {id:"s1q12",series:"s1",theory:"tirPlate",title:"Critical angle glass–air",level:1,kind:"numeric",answer:41.81,tol:0.15,unit:"deg",objectives:["Critical angle","Total internal reflection"],prompt:"Find the critical angle for glass n1=1.50 to air n2=1.00.",solution:["At critical incidence r=90 degrees.","sin ic=n2/n1=1/1.50.","ic=41.81 degrees."]},
    {id:"s1q13",series:"s1",theory:"tirPlate",title:"Apparent depth",level:2,kind:"numeric",answer:2.25,tol:0.04,unit:"m",objectives:["Plane refraction","Apparent depth"],prompt:"An object lies 3.00 m below water of index 1.333 and is viewed near normally from air. Find its apparent depth.",solution:["d_app=d_real(n_air/n_water)=3.00/1.333=2.25 m approximately."]},
    {id:"s1q14",series:"s1",theory:"tirPlate",title:"Plane-parallel plate shift",level:2,kind:"numeric",answer:1.32,tol:0.05,unit:"cm",objectives:["Plane-parallel plate"],prompt:"A glass plate is 4.00 cm thick, n=1.50. A ray in air strikes at 45.0 degrees. Find the lateral shift.",solution:["Snell gives r=28.13 degrees.","d=e sin(i-r)/cos r=4.00 sin(16.87)/cos(28.13)=1.32 cm."]},

    {id:"s2q1",series:"s2",theory:"planeMirror",title:"Plane-mirror image construction",level:1,kind:"manual",objectives:["Plane mirror","Construction"],prompt:"Construct the image of an off-axis point object in a plane mirror and state its position, nature and magnification.",solution:["Reflect two rays using i=r and extend them backward.","Their extensions meet at the point symmetric to the object about the mirror plane.","For a real object the image is virtual, upright and gamma=+1."]},
    {id:"s2q2",series:"s2",theory:"planeMirror",title:"Minimum mirror for seeing the full body",level:2,kind:"manual",objectives:["Plane mirror","Field/visibility"],prompt:"Using ray geometry, determine the minimum height of a plane mirror required for a person to see their full height. Does the answer depend on distance from the mirror?",solution:["A ray from the top of the head and one from the feet must reflect into the eyes.","By equal-angle geometry, the required mirror spans half the person's height.","The result is independent of the person's distance from the mirror."]},
    {id:"s2q3",series:"s2",theory:"planeMirror",title:"Translation of a plane mirror",level:1,kind:"numeric",answer:6,tol:0.05,unit:"cm",objectives:["Plane mirror motion"],prompt:"A fixed object faces a plane mirror. The mirror moves 3.00 cm toward the object. How far does the image move in the laboratory?",solution:["x_image=2x_mirror-x_object.","With fixed object, delta x_image=2 delta x_mirror=6.00 cm."]},
    {id:"s2q4",series:"s2",theory:"planeMirror",title:"Rotation of a plane mirror",level:1,kind:"numeric",answer:10,tol:0.05,unit:"deg",objectives:["Mirror rotation"],prompt:"The incident ray direction is fixed. A plane mirror rotates by 5.00 degrees. Through what angle does the reflected ray rotate?",solution:["The mirror normal rotates 5 degrees.","Because reflection is symmetric about the normal, the reflected direction changes by twice that amount: 10.0 degrees."]},
    {id:"s2q5",series:"s2",theory:"planeMirror",title:"Two plane mirrors at 60 degrees",level:2,kind:"numeric",answer:5,tol:0.01,unit:"images",objectives:["Multiple reflections"],prompt:"Two plane mirrors meet at 60 degrees. For a generic object on the angle bisector, how many images are expected when 360/60 is an integer?",solution:["For the standard symmetric case with 360/theta=N integer, number of images is N-1.","N=6, hence 5 images."]},
    {id:"s2q6",series:"s2",theory:"sphericalMirror",title:"Focal length from mirror radius",level:1,kind:"numeric",answer:20,tol:0.05,unit:"cm",objectives:["Spherical mirror focal point"],prompt:"A spherical mirror has radius-of-curvature magnitude 40.0 cm. What is the focal-length magnitude in Gauss conditions?",solution:["For a spherical mirror, |f|=|R|/2=20.0 cm."]},
    {id:"s2q7",series:"s2",theory:"sphericalMirror",title:"Concave mirror image distance",level:2,kind:"numeric",answer:30,tol:0.3,unit:"cm",figure:"mirror",objectives:["Mirror conjugation"],prompt:"Using real-positive magnitudes, a concave mirror has f=20.0 cm and a real object at do=60.0 cm. Find di.",solution:["1/di=1/f-1/do=1/20-1/60=1/30.","di=30.0 cm."]},
    {id:"s2q8",series:"s2",theory:"sphericalMirror",title:"Concave mirror magnification and image size",level:2,kind:"numeric",answer:-1.5,tol:0.05,unit:"cm",objectives:["Mirror magnification"],prompt:"For the previous mirror, the object height is +3.00 cm. Find the signed image height.",solution:["m=-di/do=-30/60=-0.50.","h'=mh=-0.50×3.00=-1.50 cm; negative means inverted."]},
    {id:"s2q9",series:"s2",theory:"sphericalMirror",title:"Convex mirror image",level:2,kind:"numeric",answer:-14.29,tol:0.25,unit:"cm",objectives:["Convex mirror"],prompt:"With the real-positive mirror convention, a convex mirror has f=-20.0 cm and a real object do=+50.0 cm. Find di.",solution:["1/di=1/f-1/do=-1/20-1/50=-0.0700 cm^-1.","di=-14.29 cm, a virtual image behind the mirror."]},
    {id:"s2q10",series:"s2",theory:"sphericalMirror",title:"Spherical-mirror ray construction cases",level:3,kind:"manual",objectives:["Ray construction","Image cases"],prompt:"For a concave mirror, compare image nature and size for an object beyond C, at C, between C and F, and between F and S.",solution:["Beyond C: real, inverted, reduced, between C and F.","At C: real, inverted, same size at C.","Between C and F: real, inverted, enlarged beyond C.","Between F and S: virtual, upright, enlarged behind the mirror."]},
    {id:"s2q11",series:"s2",theory:"sphericalMirror",title:"Derive the spherical-mirror conjugation law",level:3,kind:"manual",objectives:["Conjugation derivation","Gauss conditions"],prompt:"Using paraxial geometry, outline the derivation of the spherical-mirror relation and identify where the Gauss approximation enters.",solution:["Use a paraxial incident ray meeting the spherical surface at a small height.","Relate the small angles made by object ray, image ray and radius CI to oriented distances using tan alpha approximately alpha.","Apply i=r at the surface normal CI.","Eliminating the small angles gives the mirror conjugation relation; replacing sines/tangents by angles is the Gauss approximation."]},

    {id:"s3q1",series:"s3",theory:"diopter",title:"Converging or diverging spherical diopter",level:2,kind:"manual",objectives:["Diopter classification"],prompt:"Explain how the sign of surface power Phi=(n'-n)/R determines whether a spherical diopter is converging or diverging in the paraxial regime.",solution:["Positive Phi adds positive vergence and is converging.","Negative Phi adds negative vergence and is diverging.","The sign depends jointly on the index step and oriented curvature R."]},
    {id:"s3q2",series:"s3",theory:"diopter",title:"Spherical-diopter conjugation derivation",level:3,kind:"manual",objectives:["Fermat/Snell derivation","Conjugation"],prompt:"Outline a paraxial derivation of n'/SA' - n/SA = (n'-n)/SC.",solution:["Apply Snell law at a point I on the spherical surface, with the normal along CI.","Express the small incidence/refraction angles using the paraxial ray angles from A and A'.","Use sin theta approximately theta and tan theta approximately theta.","Eliminating the angles gives n'/SA' - n/SA=(n'-n)/SC."]},
    {id:"s3q3",series:"s3",theory:"diopter",title:"Spherical-diopter image position",level:2,kind:"numeric",answer:100,tol:1,unit:"cm",figure:"diopter",objectives:["Diopter conjugation"],prompt:"Use n'/SA' - n/SA=(n'-n)/SC with n=1.00, n'=1.50, SA=-100 cm and SC=+20 cm. Find SA'.",solution:["1.5/SA' - 1/(-100)=0.5/20.","1.5/SA'+0.010=0.025, so SA'=+100 cm."]},
    {id:"s3q4",series:"s3",theory:"diopter",title:"Spherical-diopter magnification",level:2,kind:"numeric",answer:-0.667,tol:0.02,unit:"",objectives:["Diopter magnification"],prompt:"For the previous diopter, calculate gamma=n SA'/(n' SA).",solution:["gamma=(1.00×100)/(1.50×-100)=-0.667.","The negative sign indicates inversion in the adopted orientation convention."]},
    {id:"s3q5",series:"s3",theory:"diopter",title:"Object and image focal distances",level:2,kind:"manual",objectives:["Diopter focal points"],prompt:"Derive SF and SF' of a spherical diopter from the conjugation relation.",solution:["For object at infinity, n'/SF'=(n'-n)/R, hence SF'=n'R/(n'-n).","For image at infinity, -n/SF=(n'-n)/R, hence SF=-nR/(n'-n)."]},
    {id:"s3q6",series:"s3",theory:"diopter",title:"Numerical diopter focal distance",level:2,kind:"numeric",answer:60,tol:0.5,unit:"cm",objectives:["Image focal distance"],prompt:"For n=1.00, n'=1.50 and R=+20.0 cm, find the image focal distance SF'.",solution:["SF'=n'R/(n'-n)=1.50×20/0.50=60.0 cm."]},
    {id:"s3q7",series:"s3",theory:"diopter",title:"Surface power",level:1,kind:"numeric",answer:2.5,tol:0.05,unit:"D",objectives:["Diopter power"],prompt:"A spherical surface R=+0.200 m separates air n=1.00 from glass n'=1.50. Find Phi.",solution:["Phi=(1.50-1.00)/0.200=+2.50 D."]},
    {id:"s3q8",series:"s3",theory:"planeDiopter",title:"Plane-diopter image position",level:2,kind:"numeric",answer:-66.67,tol:0.8,unit:"cm",objectives:["Plane diopter"],prompt:"An object is at SA=-100 cm in glass n=1.50 and viewed from air n'=1.00 across a plane surface. Find SA'.",solution:["For R to infinity, n'/SA'=n/SA.","1/SA'=1.50/(-100), giving SA'=-66.67 cm."]},
    {id:"s3q9",series:"s3",theory:"planeDiopter",title:"Fish apparent depth",level:1,kind:"numeric",answer:22.56,tol:0.3,unit:"cm",objectives:["Apparent depth"],prompt:"A fish is 30.0 cm below water of index 1.33 and viewed from air near the normal. At what depth does it appear?",solution:["d_app=30.0×1.00/1.33=22.56 cm."]},
    {id:"s3q10",series:"s3",theory:"diopter",title:"Spherical-diopter ray construction",level:3,kind:"manual",objectives:["Ray construction","Focal points"],prompt:"Describe a practical graphical construction of the paraxial image of an off-axis object through a spherical diopter once F, F' and C are known.",solution:["Use a ray through C: it meets the surface normally and is undeviated.","Use a ray parallel to the axis: after refraction it passes through F' (or appears to come from F' when virtual).","Their intersection, or the intersection of backward extensions, gives the image point."]},

    {id:"s4q1",series:"s4",theory:"prism",title:"Internal prism-angle relation",level:1,kind:"manual",objectives:["Prism geometry"],prompt:"Show geometrically that the internal refraction angles satisfy r1+r2=A.",solution:["The normals to the two prism faces are separated by the same angle as the faces' complementary geometry.","In the triangle formed by the internal ray and the two normals, angle summation gives r1+r2=A."]},
    {id:"s4q2",series:"s4",theory:"prism",title:"Prism deviation relation",level:2,kind:"manual",objectives:["Deviation"],prompt:"Derive D=i+e-A from the deviation at each prism face.",solution:["Deviation at first face is i-r1; at second face it is e-r2.","Total D=(i-r1)+(e-r2)=i+e-(r1+r2).","Since r1+r2=A, D=i+e-A."]},
    {id:"s4q3",series:"s4",theory:"prism",title:"Complete ray through a prism",level:3,kind:"numeric",answer:37.19,tol:0.25,unit:"deg",figure:"prism",objectives:["Snell law","Prism deviation"],prompt:"A=60.0 degrees, n=1.50 and incidence i=50.0 degrees in air. Determine the total deviation D for the transmitted ray.",solution:["First face: r1=asin(sin50/1.50)=30.71 degrees.","r2=A-r1=29.29 degrees.","Second face: e=asin(1.50 sin29.29)=47.19 degrees.","D=i+e-A=50+47.19-60=37.19 degrees."]},
    {id:"s4q4",series:"s4",theory:"prism",title:"Minimum deviation",level:2,kind:"numeric",answer:37.18,tol:0.2,unit:"deg",objectives:["Minimum deviation"],prompt:"A prism has A=60.0 degrees and n=1.50. Find Dmin.",solution:["At minimum deviation r=A/2=30 degrees.","sin i=n sin30=0.75, so i=48.59 degrees.","Dmin=2i-A=37.18 degrees."]},
    {id:"s4q5",series:"s4",theory:"prism",title:"Index from minimum deviation",level:2,kind:"numeric",answer:1.532,tol:0.01,unit:"",objectives:["Prism index measurement"],prompt:"A=60.0 degrees and measured Dmin=40.0 degrees. Find prism index n.",solution:["n=sin[(A+Dmin)/2]/sin(A/2)=sin50/sin30=1.532."]},
    {id:"s4q6",series:"s4",theory:"prism",title:"Condition for emergence",level:3,kind:"manual",objectives:["Emergence","Critical angle"],prompt:"Derive a criterion for whether a ray inside a prism can emerge through the second face instead of undergoing total internal reflection.",solution:["At the second face the internal incidence is r2=A-r1.","For prism index n in air, the critical angle is ic=asin(1/n).","A transmitted ray requires r2<=ic. If r2>ic, total internal reflection occurs.","Combine r1 from Snell at the first face with r2=A-r1 to test emergence for a given input incidence."]},
    {id:"s4q7",series:"s4",theory:"prism",title:"Normal incidence and grazing emergence",level:3,kind:"manual",objectives:["Limiting ray","Prism geometry"],prompt:"A ray enters the first face normally. Determine the condition on prism angle A and index n for the ray to emerge tangentially from the second face.",solution:["Normal entry gives r1=0, hence r2=A.","Tangential emergence means e=90 degrees.","Snell at the second face gives n sin A=1.","Therefore A=asin(1/n), the critical-angle condition."]},
    {id:"s4q8",series:"s4",theory:"dispersion",title:"Which colour deviates most?",level:1,kind:"mcq",options:["Violet","Red","All colours equally","Deviation is unrelated to refractive index"],correct:0,objectives:["Dispersion"],prompt:"In normal dispersion of ordinary crown glass, which visible colour has the larger minimum deviation?",solution:["Normal dispersion gives larger n at shorter wavelength.","Violet therefore has larger n and larger prism deviation than red."]},
    {id:"s4q9",series:"s4",theory:"dispersion",title:"Cauchy-law index",level:2,kind:"numeric",answer:1.516,tol:0.003,unit:"",objectives:["Cauchy law"],prompt:"Using lambda in micrometres, let n(lambda)=A+B/lambda^2 with A=1.500 and B=0.0040 micrometre^2. Find n at lambda=0.500 micrometre.",solution:["n=1.500+0.0040/(0.500)^2=1.500+0.016=1.516."]},
    {id:"s4q10",series:"s4",theory:"dispersion",title:"Determine Cauchy constants from measurements",level:3,kind:"manual",objectives:["Cauchy fit","Unknown wavelength"],prompt:"Given several measured minimum deviations for known spectral lines, describe how to determine Cauchy constants and then estimate an unknown wavelength.",solution:["Convert each Dmin to n using the minimum-deviation prism formula.","For each known wavelength compute x=1/lambda^2 and plot n versus x.","Fit n=A+Bx; intercept gives A and slope B.","For an unknown line, obtain n from its measured Dmin, solve x=(n-A)/B, then lambda=1/sqrt(x)."]},

    {id:"s5q1",series:"s5",theory:"lensMaker",title:"Identify converging and diverging lens shapes",level:1,kind:"manual",objectives:["Lens shapes","Curvature"],prompt:"Explain why a biconvex glass lens in air is normally converging while a biconcave glass lens is normally diverging, and state the role of the surrounding medium.",solution:["The two refracting surfaces of a biconvex lens in air add positive optical power; biconcave surfaces add negative power under the usual orientation.","The lens-maker relation depends on relative index n/n_medium, so changing the surrounding medium can reduce, cancel or reverse the power."]},
    {id:"s5q2",series:"s5",theory:"lensMaker",title:"Symmetric biconvex lens-maker calculation",level:2,kind:"numeric",answer:20,tol:0.4,unit:"cm",objectives:["Lens-maker relation"],prompt:"A thin glass lens in air has n=1.50, R1=+20.0 cm and R2=-20.0 cm. Find f'.",solution:["1/f'=(n-1)(1/R1-1/R2)=0.50(1/20+1/20)=0.050 cm^-1.","f'=+20.0 cm."]},
    {id:"s5q3",series:"s5",theory:"lensMaker",title:"Plano-convex lens",level:2,kind:"numeric",answer:50,tol:0.6,unit:"cm",objectives:["Lens-maker relation"],prompt:"A plano-convex thin lens in air has n=1.50, one surface R=+25.0 cm and the other plane. Find focal-length magnitude.",solution:["The plane surface contributes zero curvature.","1/f=(n-1)/R=0.50/25=0.020 cm^-1.","f=50.0 cm."]},
    {id:"s5q4",series:"s5",theory:"lensMaker",title:"Lens vergence",level:1,kind:"numeric",answer:4,tol:0.05,unit:"D",objectives:["Lens power"],prompt:"A converging lens has f'=+25.0 cm. Find its power.",solution:["Convert f'=0.250 m.","Phi=1/f'=+4.00 D."]},
    {id:"s5q5",series:"s5",theory:"thinLens",title:"Converging-lens image distance",level:1,kind:"numeric",answer:15,tol:0.2,unit:"cm",figure:"lens",objectives:["Thin-lens conjugation"],prompt:"A converging lens has f=+10.0 cm and a real object at do=30.0 cm. Find di.",solution:["1/di=1/10-1/30=1/15.","di=+15.0 cm."]},
    {id:"s5q6",series:"s5",theory:"thinLens",title:"Image cases around F and 2F",level:2,kind:"manual",objectives:["Image classification","Ray construction"],prompt:"Summarize the image for a converging lens when the real object is beyond 2F, at 2F, between F and 2F, at F, and inside F.",solution:["Beyond 2F: real, inverted, reduced between F' and 2F'.","At 2F: real, inverted, same size at 2F'.","Between F and 2F: real, inverted, enlarged beyond 2F'.","At F: emergent rays are parallel; image is at infinity.","Inside F: virtual, upright, enlarged on the object side."]},
    {id:"s5q7",series:"s5",theory:"thinLens",title:"Object inside the focal length",level:2,kind:"numeric",answer:-10,tol:0.2,unit:"cm",objectives:["Virtual image"],prompt:"A converging lens has f=+10.0 cm and a real object at do=5.00 cm. Find di.",solution:["1/di=1/10-1/5=-1/10.","di=-10.0 cm, so the image is virtual."]},
    {id:"s5q8",series:"s5",theory:"thinLens",title:"Diverging-lens image",level:1,kind:"numeric",answer:-10,tol:0.2,unit:"cm",objectives:["Diverging lens"],prompt:"A diverging lens has f=-15.0 cm and a real object at do=30.0 cm. Find di.",solution:["1/di=-1/15-1/30=-1/10.","di=-10.0 cm: virtual, upright and reduced."]},
    {id:"s5q9",series:"s5",theory:"thinLens",title:"Magnification and image height",level:2,kind:"numeric",answer:-1,tol:0.05,unit:"cm",objectives:["Magnification"],prompt:"For f=10.0 cm and do=30.0 cm, an object is 2.00 cm high. Find signed image height.",solution:["di=15.0 cm.","m=-di/do=-0.50.","h'=mh=-1.00 cm."]},
    {id:"s5q10",series:"s5",theory:"thinLens",title:"Three principal rays",level:2,kind:"manual",objectives:["Ray construction"],prompt:"Describe the three standard rays used to construct an image through a thin converging lens.",solution:["A ray parallel to the principal axis emerges through image focus F'.","A ray through object focus F emerges parallel to the axis.","A ray through the optical centre is taken as undeviated in the thin-lens approximation.","The intersection of any two emergent rays gives the image point."]},
    {id:"s5q11",series:"s5",theory:"lensSystems",title:"Newton conjugation",level:3,kind:"manual",objectives:["Newton form"],prompt:"State the Newton conjugation relation and explain what distances are measured.",solution:["Newton form uses distances from the focal points rather than the lens centre.","If x is measured from the object focal point F and x' from image focal point F', then xx'=ff'.","For a thin lens in the same medium on both sides, the magnitude product is f'^2."]},
    {id:"s5q12",series:"s5",theory:"lensSystems",title:"Two lenses in contact",level:2,kind:"numeric",answer:33.33,tol:0.5,unit:"cm",objectives:["Lens combination"],prompt:"Two thin lenses in contact have f1=+20.0 cm and f2=-50.0 cm. Find equivalent focal length.",solution:["Phi1=+5 D, Phi2=-2 D.","Phi_eq=+3 D.","f_eq=1/3 m=33.33 cm."]},
    {id:"s5q13",series:"s5",theory:"lensSystems",title:"Separated lenses",level:3,kind:"numeric",answer:15,tol:0.4,unit:"cm",objectives:["Separated lenses"],prompt:"Lenses f1=20.0 cm and f2=30.0 cm are separated by d=10.0 cm. Find equivalent focal length.",solution:["Phi1=5 D, Phi2=3.333 D and d=0.100 m.","Phi_eq=5+3.333-0.100(5)(3.333)=6.667 D.","f_eq=0.150 m=15.0 cm."]},
    {id:"s5q14",series:"s5",theory:"lensSystems",title:"Afocal lens pair",level:3,kind:"numeric",answer:25,tol:0.1,unit:"cm",objectives:["Afocal system"],prompt:"Two converging lenses have focal lengths 20.0 cm and 5.00 cm. What separation makes the pair afocal?",solution:["For the Kepler-type two-positive-lens afocal condition, d=f1+f2=25.0 cm."]},

    {id:"s6q1",series:"s6",theory:"eye",title:"Power of a reduced relaxed eye",level:2,kind:"numeric",answer:60.61,tol:0.5,unit:"D",objectives:["Reduced eye","Power"],prompt:"Model an emmetropic relaxed eye as a thin lens focusing parallel rays on a retina 16.5 mm behind it. Find its optical power.",solution:["For an object at infinity, f'=retina distance=0.0165 m.","Phi=1/0.0165=60.61 D."]},
    {id:"s6q2",series:"s6",theory:"eye",title:"Accommodation amplitude",level:1,kind:"numeric",answer:4,tol:0.1,unit:"D",objectives:["Accommodation"],prompt:"A normal eye has far point at infinity and near point 25.0 cm. Find accommodation amplitude.",solution:["A=1/0.250-0=4.00 D."]},
    {id:"s6q3",series:"s6",theory:"eye",title:"Eye power at a near object",level:2,kind:"numeric",answer:65.61,tol:0.6,unit:"D",objectives:["Accommodation","Reduced eye"],prompt:"Using the 16.5 mm reduced-eye model, what total power is needed to focus an object 20.0 cm in front of the eye on the retina?",solution:["Required vergence is approximately 1/0.0165 + 1/0.200.","Phi=60.61+5.00=65.61 D."]},
    {id:"s6q4",series:"s6",theory:"eye",title:"Myopia correction",level:2,kind:"numeric",answer:-2,tol:0.08,unit:"D",objectives:["Myopia"],prompt:"A myopic eye has far point 0.500 m in front. Find spectacle power to see infinity clearly, neglecting vertex distance.",solution:["The corrective lens must form a virtual image of infinity at -0.500 m.","f=-0.500 m, so P=-2.00 D."]},
    {id:"s6q5",series:"s6",theory:"eye",title:"Near-vision correction for a receded near point",level:2,kind:"numeric",answer:3,tol:0.1,unit:"D",objectives:["Hyperopia/presbyopia","Near correction"],prompt:"A person can focus no closer than 1.00 m. What approximate positive lens power lets them read at 25.0 cm, neglecting lens-eye separation?",solution:["The lens should make an object at 25 cm appear at the unaided near point 1.00 m.","Required added vergence is 1/0.25-1/1.00=4-1=+3.00 D."]},
    {id:"s6q6",series:"s6",theory:"eye",title:"Near point, far point and clear-vision interval",level:2,kind:"manual",objectives:["Near/far points","Accommodation"],prompt:"Define the punctum remotum (far point), punctum proximum (near point) and accommodation amplitude, and explain how they delimit clear vision.",solution:["Far point PR is the farthest object point focused without accommodation.","Near point PP is the nearest point focused at maximum accommodation.","The clear-vision interval lies between PP and PR.","In magnitude form A=1/PP-1/PR in dioptres."]},
    {id:"s6q7",series:"s6",theory:"magnifier",title:"Magnifier in relaxed-eye adjustment",level:1,kind:"numeric",answer:5,tol:0.1,unit:"x",objectives:["Magnifier"],prompt:"A simple magnifier has f=5.00 cm. With reference D=25.0 cm and final image at infinity, find angular magnification.",solution:["G=D/f=25/5=5.0x."]},
    {id:"s6q8",series:"s6",theory:"magnifier",title:"Magnifier with final image at near point",level:2,kind:"numeric",answer:6,tol:0.1,unit:"x",objectives:["Magnifier","Near-point adjustment"],prompt:"For the same f=5.00 cm magnifier and D=25.0 cm, find the common near-point magnification G=1+D/f.",solution:["G=1+25/5=6.0x."]},
    {id:"s6q9",series:"s6",theory:"microscope",title:"Roles of microscope objective and eyepiece",level:2,kind:"manual",objectives:["Microscope","Intermediate image"],prompt:"Explain the separate optical roles of the objective and eyepiece in a compound microscope and state the nature of the intermediate image.",solution:["The short-focal-length objective forms a real, inverted, enlarged intermediate image inside the tube.","The eyepiece views that intermediate image as a magnifier and produces the final virtual image for the eye."]},
    {id:"s6q10",series:"s6",theory:"microscope",title:"Microscope magnification from two stages",level:2,kind:"numeric",answer:300,tol:3,unit:"x",figure:"microscope",objectives:["Microscope magnification"],prompt:"The objective gives transverse magnification magnitude 60x and the eyepiece gives angular magnification 5x. Find total magnitude.",solution:["|G_total|=|m_objective|G_eyepiece=60×5=300x."]},
    {id:"s6q11",series:"s6",theory:"microscope",title:"Approximate microscope design formula",level:3,kind:"numeric",answer:125,tol:3,unit:"x",objectives:["Microscope design"],prompt:"Use |G|≈(L/f_obj)(D/f_eye) with L=16.0 cm, f_obj=0.800 cm, f_eye=4.00 cm and D=25.0 cm. Find |G|.",solution:["L/f_obj=16/0.8=20.","D/f_eye=25/4=6.25.","|G|=20×6.25=125x."]},
    {id:"s6q12",series:"s6",theory:"microscope",title:"Microscope ray-path synthesis",level:3,kind:"manual",objectives:["Microscope construction","Final image"],prompt:"Describe the full image sequence for a microscope adjusted for relaxed viewing, from the specimen to the observer's eye.",solution:["Place the specimen just beyond the objective focal point.","The objective forms a real inverted enlarged intermediate image near the eyepiece object focal plane.","The eyepiece receives this intermediate image and sends nearly parallel rays to the relaxed eye.","The final image is virtual and angularly enlarged; the overall orientation remains inverted relative to the specimen."]}
  ]
};