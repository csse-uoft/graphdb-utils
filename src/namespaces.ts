export const namespaces: {[key: string]: string} = {
    'owl': 'http://www.w3.org/2002/07/owl#',
    'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
    'xml': 'http://www.w3.org/XML/1998/namespace',
    'xsd': 'http://www.w3.org/2001/XMLSchema#',
};

export function addNamespace(prefix: string, uri: string) {
    if (namespaces[prefix]) {
        throw Error(`Duplicated Namespace prefix=${prefix}, uri=${uri}`);
    }
    namespaces[prefix] = uri;
}
