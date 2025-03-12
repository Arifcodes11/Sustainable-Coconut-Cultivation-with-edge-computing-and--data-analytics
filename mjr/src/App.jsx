import React, { useEffect, useState } from "react";
import axios from "axios";
import ChatApp from "./llm2.jsx"
import Graph from "./graph.jsx"
// Add Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <h2>Something went wrong.</h2>;
    }
    return this.props.children;
  }
}

const diseaseInfo = {
  CCI_Caterpillars: {
    characteristic: "Caterpillars chew through the leaflets, causing visible holes and damage.",
    precautions: [
      " Collect and destroy caterpillars and their eggs manually during early stages.",
      " Spray a homemade neem oil solution (3-5%) by mixing 30-50 ml of neem oil with 1 liter of water and a small amount of soap as an emulsifier.",
      " Use a turmeric solution (100 g turmeric powder in 5 liters of water) to deter caterpillar activity.",
      " Maintain field hygiene by removing plant debris and weeds where caterpillars might hide.",
      " Use light traps or sticky traps at night to catch adult moths.",
    ],
    image:"caterpillars.jpg",
  },
  CCI_Leaflets: {
    characteristic: "Damaged or discolored leaflets, often with irregular patterns.",
    precautions: [
      "Prepare and apply a fermented cow dung solution: Mix 10 kg cow dung with 10 liters of water and allow it to ferment for a week, then dilute and spray on the affected areas.",
      "Use ash from burnt dried leaves and mix it with water to spray on leaflets as a natural antifungal.",
      "Regularly inspect and prune the damaged portions of the leaflets to prevent further spread.",
      "Incorporate compost or vermicompost around the coconut tree base to improve soil health and disease resistance.",
    ],
    image:"leaflets.jpg",
  },
  WCLWD_DryingofLeaflets: {
    characteristic: "Leaflets appear dry and brittle, showing signs of dehydration.",
    precautions: [
      "pply coconut coir dust or husk around the tree base to retain soil moisture.",
      " Use a buttermilk spray (1 liter of buttermilk in 10 liters of water) to strengthen the plants.",
      " Apply a slurry of cow dung and cow urine mixed with water around the tree to improve soil fertility and moisture retention.",
      " Mulch the tree base with dry leaves, straw, or other organic matter to prevent moisture loss.",
    ],
    image:"dryingofLeafleats.JPG",
  },
  WCLWD_Flaccidity: {
    characteristic: "Leaves lose rigidity and appear droopy.",
    precautions: [
      " Use a mixture of 1 liter of cow urine and 10 liters of water as a foliar spray to improve plant vitality.",
      " Apply fermented banana peel solution (banana peels soaked in water for 3-5 days) as a potassium-rich fertilizer.",
      " Avoid overwatering by using coconut husk or coir pith mulch to regulate soil moisture.",
      " Ensure proper drainage by loosening the soil around the tree base regularly.",
    ],
    image:"flaccidity.JPG",
  },
  WCLWD_Yellowing: {
    characteristic: "Leaflets turn yellow, indicating nutrient deficiency or disease onset.",
    precautions:[
      " Spray a solution made from 500 g of jaggery dissolved in 10 liters of water to promote microbial activity in the soil.",
       "Apply panchagavya (a mixture of cow dung, cow urine, milk, curd, and ghee) diluted in water (1:10 ratio) as a foliar spray and soil drench.",
       "Use compost tea (made by soaking compost in water for 24-48 hours) to replenish micronutrients.",
       "Ferment onion and garlic paste with water for 2-3 days, then dilute and spray to strengthen plants and ward off pests.",
     ],
     image:"yellowing.JPG",
  },
};
const App = () => {
  const [currentView, setCurrentView] = useState("home");
  const [file, setFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [diseaseDetectionResult, setDiseaseDetectionResult] = useState(null);
  const [fileType, setFileType] = useState(null);

  // Handle file change
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setFileType(selectedFile.type.startsWith("video") ? "video" : "image");
  };

  // Handle file upload for counting
  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      alert("Please upload a file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("http://172.20.10.5:5033/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadResult(response.data);
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Error uploading file.");
    }
  };

  // Handle disease detection
  const handleDiseaseDetection = async (e) => {
    e.preventDefault();
    if (!file) {
      alert("Please upload an image for disease detection.");
      return;
    }

    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await axios.post("http://172.20.10.5:5033/disease", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setDiseaseDetectionResult(response.data);
    } catch (error) {
      console.error("Error during disease detection:", error);
      alert("Error during disease detection.");
    }
  };

  // Class Information with images for each class
  const classInfo = {
    Mature: {
      characteristic: "Fully developed coconuts with brown husks and hard shells.",
      attributes: "Mature coconuts are harvested for producing coconut water, oil, and meat. They are typically heavier and have a larger size compared to premature coconuts.",
      image: "data:image/jpeg;base64,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", // Path to the image for mature coconut
    },
    Potential: {
      characteristic: "Coconuts nearing maturity but still in an immature stage.",
      attributes: "Potential coconuts have a good potential for yielding high-quality products but need a few more weeks to mature.",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRN7Mn5UikCL18bxX_qP7i0USpM1Slgue3dWA&s", // Path to the image for potential coconut
    },
    Premature: {
      characteristic: "Unripe coconuts that are not fully developed.",
      attributes: "Premature coconuts are typically lighter, and their husks are green. They may be used for water extraction but not for meat or oil.",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQp3AgcIsanYR5pixSmlEzNjNUCRgfKf1UeRQ&s", // Path to the image for premature coconut
    },
  };

  return (
    <ErrorBoundary>
      <div style={styles.container}>
        {/* Navigation */}
        <nav style={styles.navbar}>
          <h1 style={styles.navTitle}>Coconut Analyzer</h1>
          <ul style={styles.navItems}>
            <li onClick={() => setCurrentView("home")} style={styles.navItem}>
              Home
            </li>
            <li onClick={() => setCurrentView("upload")} style={styles.navItem}>
              Upload for Counting
            </li>
            <li onClick={() => setCurrentView("disease")} style={styles.navItem}>
              Disease Detection
            </li>
            <li onClick={() => setCurrentView("chat")} style={styles.navItem}>
              chat
            </li>
	  <li onClick={() => setCurrentView("graph")} style={styles.navItem}>
              graph
            </li>

          </ul>
        </nav>

        {/* Page Content */}
        <div>
          {currentView === "home" && (
            <div style={styles.section}>
              <h2>Welcome to Coconut Analyzer</h2>
              <p>Analyze coconut maturity, count, and detect diseases efficiently!</p>
            </div>
          )}

          {currentView === "upload" && (
            <div style={styles.section}>
              <h2>Upload Image or Video for Counting</h2>
              <form onSubmit={handleFileUpload}>
                <input type="file" onChange={handleFileChange} />
                <button type="submit" style={styles.button}>
                  Upload
                </button>
              </form>
              {file && (
                <div style={styles.filePreview}>
                  <h4>Uploaded File:</h4>
                  {fileType === "image" ? (
                    <img
                      src={URL.createObjectURL(file)}
                      alt="Uploaded"
                      style={styles.uploadedFile}
                    />
                  ) : (
                    <video
                      src={URL.createObjectURL(file)}
                      controls
                      style={styles.uploadedFile}
                    />
                  )}
                </div>
              )}
              {uploadResult && (
                <div style={styles.result}>
                  <h3>Counting Results:</h3>
                  <pre>{JSON.stringify(uploadResult, null, 2)}</pre>
                </div>
              )}
              {/* Displaying Class Information in Blog Style with Images */}
              <div style={styles.blogSection}>
                <h3 style={styles.blogTitle}>Classes of Coconuts</h3>
                {Object.keys(classInfo).map((key) => (
                  <div style={styles.blogPost} key={key}>
                    <h4 style={styles.blogPostTitle}>{key}</h4>
                    <div style={styles.blogPostContent}>
                      <img
                        src={classInfo[key].image}
                        alt={key}
                        style={styles.classImage}
                      />
                      <div>
                        <p><strong>Characteristic:</strong> {classInfo[key].characteristic}</p>
                        <p><strong>Attributes:</strong> {classInfo[key].attributes}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentView === "disease" && (
    <div style={styles.section}>
      <h2>Upload Image for Disease Detection</h2>
      <form onSubmit={handleDiseaseDetection}>
        <input type="file" onChange={handleFileChange} />
        <button type="submit" style={styles.button}>
          Detect Disease
        </button>
      </form>
      {file && (
        <div style={styles.imagePreview}>
          <h4>Uploaded Image:</h4>
          <img
            src={URL.createObjectURL(file)}
            alt="Uploaded"
            style={styles.uploadedImage}
          />
        </div>
      )}
      {diseaseDetectionResult && (
        <div style={styles.diseaseResultContainer}>
          <div style={styles.resultDetails}>
            <h3>Disease Detection Results:</h3>
            <p>
              <strong>Predicted Class:</strong> {diseaseDetectionResult.predicted_class}
            </p>
            <p>
              <strong>Confidence:</strong> {diseaseDetectionResult.confidence.toFixed(2)}
            </p>
            {diseaseInfo[diseaseDetectionResult.predicted_class] && (
              <div>
                <h4>Details:</h4>
                <p>
                  <strong>Characteristic:</strong>{" "}
                  {diseaseInfo[diseaseDetectionResult.predicted_class].characteristic}
                </p>
                <p><strong>Precautionary Measures:</strong></p>
                <ul>
                  {diseaseInfo[diseaseDetectionResult.predicted_class].precautions.map((precaution, index) => (
                      <li key={index}>{precaution}</li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={styles.blogSection}>
        <h3 style={styles.blogTitle}>Coconut Diseases and Precautions</h3>
        {Object.keys(diseaseInfo).map((key) => (
          <div style={styles.blogPost} key={key}>
            <h4 style={styles.blogPostTitle}>{key.replace(/_/g, " ")}</h4>
            <div style={styles.blogPostContent}>
              <img
                src={diseaseInfo[key].image}
                alt={key}
                style={styles.classImage}
              />
              <div>
                <p><strong>Characteristic:</strong> {diseaseInfo[key].characteristic}</p>
                <p><strong>Precautionary Measures:</strong></p>
                <ul>
                  {diseaseInfo[key].precautions.map((precaution, index) => (
                    <li key={index}>{precaution}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>


  )}

          {currentView === "chat" && (
          <div style={styles.section1}>
            <ChatApp /> {/* Render the ChatApp component */}
          </div>
        )}
{currentView === "graph" && (
          <div style={styles.section1}>
            <Graph/> {/* Render the ChatApp component */}
          </div>
        )}
        </div>


      </div>
    </ErrorBoundary>
  );
};

// Styles
const styles = {
  container: { fontFamily: "Arial, sans-serif" },
  navbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 20px",
    backgroundColor: "#007BFF",
    color: "white",
  },
  navTitle: { fontSize: "24px" },
  navItems: { display: "flex", gap: "15px", listStyle: "none" },
  navItem: { cursor: "pointer", color: "white" },
  section: { padding: "20px", textAlign: "center" },
  button: {
    marginTop: "15px",
    padding: "10px 20px",
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
  result: { marginTop: "20px", textAlign: "left" },
  blogSection: {
    marginTop: "30px",
    padding: "20px",
    backgroundColor: "#f8f9fa",
    borderRadius: "10px",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
    textAlign: "left",
  },
  blogTitle: {
    fontSize: "1.5rem",
    fontWeight: "bold",
    color: "#333",
    marginBottom: "20px",
  },
  blogPost: {
    marginBottom: "20px",
    padding: "15px",
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
  },
  blogPostTitle: {
    fontSize: "1.2rem",
    color: "#007BFF",
    fontWeight: "bold",
  },
  blogPostContent: {
    display: "flex",
    gap: "20px",
    alignItems: "center",
  },
  classImage: {
    width: "120px",
    height: "120px",
    borderRadius: "10px",
    objectFit: "cover",
  },
  footer: {
    padding: "10px 20px",
    backgroundColor: "#007BFF",
    color: "white",
    textAlign: "center",
    marginTop: "auto",
  },

 button: {
   marginTop: "15px",
   padding: "10px 20px",
   backgroundColor: "#28a745",
   color: "white",
   border: "none",
   borderRadius: "5px",
   cursor: "pointer",
 },
 imagePreview: {
   marginTop: "20px",
   textAlign: "center",
 },
 uploadedImage: {
   width: "300px",
   height: "300px",
   objectFit: "contain",
   border: "1px solid #ccc",
   borderRadius: "10px",
   marginTop: "10px",
   position:"absolute",
   right:"20px",

 },
 diseaseResultContainer: {
   display: "flex",
   alignItems: "flex-start",
   gap: "20px",
   marginTop: "20px",
   justifyContent: "center",
 },
 resultDetails: {
   flex: 1,
   textAlign: "left",
 },
 filePreview: {
   marginTop: "20px",
   textAlign: "center",
 },
 uploadedFile: {
   width: "300px",
   height: "300px",
   objectFit: "contain",
   border: "1px solid #ccc",
   borderRadius: "10px",
   marginTop: "10px",
 },
};

export default App;
