<template>
	<!--
		WikiLambda Vue interface module for selecting a Type

		@copyright 2020 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<select
		v-model="type"
		@change="updateType($event)"
	>
		<option v-for="ztype in ztypes"
			:key="ztype.value"
			:value="ztype.value"
		>
			{{ ztype.label }} ({{ ztype.value }})
		</option>
	</select>
</template>

<script>

module.exports = {
	name: 'TypeSelector',
	props: [ 'type' ],
	methods: {
		updateType: function ( event ) {
			this.type = event.target.value;
			this.$emit( 'change', this.type );
		}
	},
	data: function () {
		var index,
			editingData = mw.config.get( 'extWikilambdaEditingData' ),
			typeoptions = [];

		for ( index in editingData.ztypes ) {
			typeoptions.push( {
				value: index,
				label: editingData.ztypes[ index ]
			} );
		}

		return {
			ztypes: typeoptions
		};
	}
};
</script>
